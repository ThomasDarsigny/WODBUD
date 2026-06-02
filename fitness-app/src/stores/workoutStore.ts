import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { supabase } from '../lib/supabase'
import { computeMuscleAlerts } from '../lib/muscleAlerts'
import type {
  Exercise,
  WorkoutExercise,
  Workout,
  WorkoutMethod,
  MuscleAlert,
  ExerciseCategory,
  MuscleGroup
} from '../types'
import { CARDIO_MUSCLES, LOWER_MUSCLES, MUSCLE_GROUP_LABELS, UPPER_MUSCLES } from '../types'

type WorkoutRow = {
  id: string
  name: string
  method: WorkoutMethod
  duration_minutes?: number
  notes?: string
  created_at: string
}

type RecentWorkoutRow = {
  id: string
  created_at: string
}

type WorkoutExerciseRow = {
  workout_id: string
  exercise_id: string
}

type ExerciseMusclePrimaryRow = {
  exercise_id: string
}

type MuscleGroupLookupRow = {
  id: string
}

const MS_48H = 48 * 60 * 60 * 1000

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === 'object' && err !== null) {
    const maybeError = err as Record<string, unknown>
    const candidates = [
      maybeError.message,
      maybeError.error,
      maybeError.error_description,
      maybeError.details,
      maybeError.hint
    ]

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value
      }
    }
  }

  return 'Erreur inconnue'
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user?.id) {
    throw new Error("Session invalide: reconnecte-toi pour sauvegarder l'entrainement.")
  }

  return user.id
}

function getMuscleLookupKeys(primaryMuscle: MuscleGroup): string[] {
  if (primaryMuscle === 'core') return ['core', 'abs']
  if (primaryMuscle === 'quads') return ['quads', 'quadriceps']
  return [primaryMuscle]
}

async function getPrimaryMuscleRestBlock(primaryMuscle: MuscleGroup): Promise<{
  blocked: boolean
  hoursRemaining: number
  lastWorkoutAt: string | null
  recommendedAt: string | null
}> {
  const muscleLookupKeys = getMuscleLookupKeys(primaryMuscle)

  const { data: muscleData, error: muscleError } = await (supabase as any)
    .from('muscle_groups')
    .select('id')
    .in('name_key', muscleLookupKeys)
    .limit(1)
    .maybeSingle()

  if (muscleError) throw muscleError
  const muscleGroupId = (muscleData as MuscleGroupLookupRow | null)?.id
  if (!muscleGroupId) {
    return { blocked: false, hoursRemaining: 0, lastWorkoutAt: null, recommendedAt: null }
  }

  const cutoffDate = new Date(Date.now() - MS_48H).toISOString()

  const { data: workoutsData, error: workoutsError } = await (supabase as any)
    .from('workouts')
    .select('id, created_at')
    .gte('created_at', cutoffDate)
    .order('created_at', { ascending: false })

  if (workoutsError) throw workoutsError

  const recentWorkouts = (workoutsData ?? []) as RecentWorkoutRow[]
  if (recentWorkouts.length === 0) {
    return { blocked: false, hoursRemaining: 0, lastWorkoutAt: null, recommendedAt: null }
  }

  const recentWorkoutIds = recentWorkouts.map((w) => w.id)

  const { data: workoutExercisesData, error: workoutExercisesError } = await (supabase as any)
    .from('workout_exercises')
    .select('workout_id, exercise_id')
    .in('workout_id', recentWorkoutIds)

  if (workoutExercisesError) throw workoutExercisesError

  const workoutExercises = (workoutExercisesData ?? []) as WorkoutExerciseRow[]
  if (workoutExercises.length === 0) {
    return { blocked: false, hoursRemaining: 0, lastWorkoutAt: null, recommendedAt: null }
  }

  const exerciseIds = Array.from(new Set(workoutExercises.map((row) => row.exercise_id)))

  const { data: primaryMusclesData, error: primaryMusclesError } = await (supabase as any)
    .from('exercise_muscles')
    .select('exercise_id')
    .eq('muscle_group_id', muscleGroupId)
    .eq('role', 'primary')
    .in('exercise_id', exerciseIds)

  if (primaryMusclesError) throw primaryMusclesError

  const matchedPrimaryMuscles = (primaryMusclesData ?? []) as ExerciseMusclePrimaryRow[]
  if (matchedPrimaryMuscles.length === 0) {
    return { blocked: false, hoursRemaining: 0, lastWorkoutAt: null, recommendedAt: null }
  }

  const matchedExerciseIds = new Set(matchedPrimaryMuscles.map((row) => row.exercise_id))
  const workoutDateMap = new Map(recentWorkouts.map((w) => [w.id, new Date(w.created_at).getTime()]))

  let latestTimestamp = 0
  for (const row of workoutExercises) {
    if (!matchedExerciseIds.has(row.exercise_id)) continue
    const ts = workoutDateMap.get(row.workout_id)
    if (ts && ts > latestTimestamp) latestTimestamp = ts
  }

  if (!latestTimestamp) {
    return { blocked: false, hoursRemaining: 0, lastWorkoutAt: null, recommendedAt: null }
  }

  const elapsed = Date.now() - latestTimestamp
  if (elapsed >= MS_48H) {
    return {
      blocked: false,
      hoursRemaining: 0,
      lastWorkoutAt: new Date(latestTimestamp).toISOString(),
      recommendedAt: new Date(latestTimestamp + MS_48H).toISOString()
    }
  }

  const remainingMs = MS_48H - elapsed
  return {
    blocked: true,
    hoursRemaining: Math.ceil(remainingMs / (60 * 60 * 1000)),
    lastWorkoutAt: new Date(latestTimestamp).toISOString(),
    recommendedAt: new Date(latestTimestamp + MS_48H).toISOString()
  }
}

type AddExerciseResult = {
  added: boolean
  requiresRestOverride?: boolean
  restWarningMessage?: string
  hoursRemaining?: number
  requiresCardioSequenceOverride?: boolean
  cardioSequenceMessage?: string
}

type AddExerciseOptions = {
  forceRest?: boolean
  forceCardioSequence?: boolean
}

function getMuscleZone(muscle: MuscleGroup): 'upper' | 'lower' | null {
  if (UPPER_MUSCLES.includes(muscle)) return 'upper'
  if (LOWER_MUSCLES.includes(muscle)) return 'lower'
  return null
}

function formatHumanDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString('fr-CA', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface WorkoutBuilderState {
  name: string
  method: WorkoutMethod
  durationMinutes: number | undefined
  notes: string
  exercises: WorkoutExercise[]
  muscleAlerts: MuscleAlert[]
  savedWorkouts: Workout[]
  loadingSave: boolean
  error: string | null
  setName: (name: string) => void
  setMethod: (method: WorkoutMethod) => void
  setDuration: (min: number | undefined) => void
  setNotes: (notes: string) => void
  addExercise: (exercise: Exercise, options?: AddExerciseOptions) => Promise<AddExerciseResult>
  removeExercise: (id: string) => void
  updateExerciseConfig: (
    id: string,
    config: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'weight' | 'rest_seconds' | 'notes'>>
  ) => void
  resetDraft: () => void
  saveWorkout: () => Promise<void>
  fetchWorkouts: () => Promise<void>
}

const DEFAULT_DRAFT: Pick<
  WorkoutBuilderState,
  'name' | 'method' | 'durationMinutes' | 'notes' | 'exercises' | 'muscleAlerts'
> = {
  name: '',
  method: 'custom',
  durationMinutes: undefined,
  notes: '',
  exercises: [],
  muscleAlerts: []
}

const EMPTY_EXERCISE: Exercise = {
  id: '',
  name: '',
  description: '',
  category: 'strength' as ExerciseCategory,
  primary_muscle: 'core' as MuscleGroup,
  secondary_muscles: [],
  video_url: null,
  video_path: null,
  created_at: '',
  updated_at: ''
}

export const useWorkoutStore = create<WorkoutBuilderState>((set, get) => ({
  ...DEFAULT_DRAFT,
  savedWorkouts: [],
  loadingSave: false,
  error: null,

  setName: (name) => set({ name }),
  setMethod: (method) => set({ method }),
  setDuration: (durationMinutes) => set({ durationMinutes }),
  setNotes: (notes) => set({ notes }),

  addExercise: async (exercise, options) => {
    try {
      const currentExercises = get().exercises
      const previousExercise = currentExercises[currentExercises.length - 1]?.exercise

      if (
        exercise.category === 'cardio' &&
        CARDIO_MUSCLES.includes(exercise.primary_muscle) &&
        previousExercise
      ) {
        const previousZone = getMuscleZone(previousExercise.primary_muscle)

        if (previousZone && !options?.forceCardioSequence) {
          const expectedCardio = previousZone === 'lower' ? 'cardio_upper' : 'cardio_lower'
          if (exercise.primary_muscle !== expectedCardio) {
            const previousZoneLabel = previousZone === 'lower' ? 'bas du corps' : 'haut du corps'
            const expectedCardioLabel = MUSCLE_GROUP_LABELS[expectedCardio]
            const cardioSequenceMessage = `On vient de solliciter le ${previousZoneLabel} avec "${previousExercise.name}". Pour alterner les zones, on recommande ${expectedCardioLabel}. Voulez-vous vraiment ajouter "${exercise.name}" meme si on vient de faire cette partie du corps ?`

            set({ error: cardioSequenceMessage })
            return {
              added: false,
              requiresCardioSequenceOverride: true,
              cardioSequenceMessage
            }
          }
        }
      }

      const restBlock = await getPrimaryMuscleRestBlock(exercise.primary_muscle)

      if (restBlock.blocked && !options?.forceRest) {
        const lastText = restBlock.lastWorkoutAt
          ? formatHumanDateTime(restBlock.lastWorkoutAt)
          : 'recemment'
        const recommendedText = restBlock.recommendedAt
          ? formatHumanDateTime(restBlock.recommendedAt)
          : `dans environ ${restBlock.hoursRemaining}h`
        const warningMessage = `Alerte 48h: ${MUSCLE_GROUP_LABELS[exercise.primary_muscle]} deja travaille ${lastText}. Reprise conseillee a partir de ${recommendedText} (reste ~${restBlock.hoursRemaining}h).`
        set({
          error: warningMessage
        })
        return {
          added: false,
          requiresRestOverride: true,
          restWarningMessage: warningMessage,
          hoursRemaining: restBlock.hoursRemaining
        }
      }

      const exercises = [
        ...currentExercises,
        {
          id: uuid(),
          exercise,
          position: currentExercises.length + 1,
          sets: 3,
          reps: 10
        }
      ]
      set({ exercises, muscleAlerts: computeMuscleAlerts(exercises), error: null })
      return { added: true }
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: `Impossible de verifier la regle 48h: ${message}` })
      return { added: false }
    }
  },

  removeExercise: (id) => {
    const exercises = get()
      .exercises.filter((e) => e.id !== id)
      .map((e, i) => ({ ...e, position: i + 1 }))
    set({ exercises, muscleAlerts: computeMuscleAlerts(exercises) })
  },

  updateExerciseConfig: (id, config) => {
    const exercises = get().exercises.map((e) => (e.id === id ? { ...e, ...config } : e))
    set({ exercises, muscleAlerts: computeMuscleAlerts(exercises) })
  },

  resetDraft: () => set({ ...DEFAULT_DRAFT }),

  saveWorkout: async () => {
    const { name, method, durationMinutes, notes, exercises } = get()
    if (!name.trim()) throw new Error("Le nom de l'entrainement est requis")
    if (exercises.length === 0) throw new Error('Ajoute au moins un exercice')

    set({ loadingSave: true, error: null })
    try {
      const userId = await getCurrentUserId()

      const { data: workoutRow, error } = await (supabase as any)
        .from('workouts')
        .insert({ name, method, duration_minutes: durationMinutes, notes, created_by: userId })
        .select()
        .single()

      if (error) throw error

      const exerciseRows = exercises.map((we) => ({
        workout_id: workoutRow.id,
        exercise_id: we.exercise.id,
        position: we.position,
        sets: we.sets,
        reps: we.reps,
        weight: we.weight,
        rest_seconds: we.rest_seconds,
        notes: we.notes
      }))

      const { error: exError } = await (supabase as any)
        .from('workout_exercises')
        .insert(exerciseRows)
      if (exError) throw exError

      const saved: Workout = {
        id: workoutRow.id,
        name,
        method,
        duration_minutes: durationMinutes,
        notes,
        exercises,
        created_at: workoutRow.created_at
      }

      set((s) => ({
        savedWorkouts: [saved, ...s.savedWorkouts],
        loadingSave: false,
        ...DEFAULT_DRAFT
      }))
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: message, loadingSave: false })
      throw err
    }
  },

  fetchWorkouts: async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const lightweight = ((data ?? []) as WorkoutRow[]).map((w) => ({
        id: w.id,
        name: w.name,
        method: w.method,
        duration_minutes: w.duration_minutes,
        notes: w.notes,
        exercises: [],
        created_at: w.created_at
      }))

      set({ savedWorkouts: lightweight })
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err) })
    }
  }
}))

export { EMPTY_EXERCISE }