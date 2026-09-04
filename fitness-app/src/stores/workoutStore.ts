import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import i18n from '../i18n'
import { supabase } from '../lib/supabase'
import { saveToCache, loadFromCache } from '../lib/offlineCache'
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
import { CARDIO_MUSCLES, LOWER_MUSCLES, MUSCLE_GROUP_I18N_KEYS, UPPER_MUSCLES } from '../types'

// La colonne en base s'appelle `title`; le type métier de l'app utilise `name`.
// La conversion se fait ici, au seul endroit qui parle à PostgREST.
type WorkoutRow = {
  id: string
  title: string
  method: WorkoutMethod
  duration_minutes?: number
  notes?: string
  created_at: string
  created_by?: string | null
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

  const { data: muscleData, error: muscleError } = await supabase
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

  const { data: workoutsData, error: workoutsError } = await supabase
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

  const { data: workoutExercisesData, error: workoutExercisesError } = await supabase
    .from('workout_exercises')
    .select('workout_id, exercise_id')
    .in('workout_id', recentWorkoutIds)

  if (workoutExercisesError) throw workoutExercisesError

  const workoutExercises = (workoutExercisesData ?? []) as WorkoutExerciseRow[]
  if (workoutExercises.length === 0) {
    return { blocked: false, hoursRemaining: 0, lastWorkoutAt: null, recommendedAt: null }
  }

  const exerciseIds = Array.from(new Set(workoutExercises.map((row) => row.exercise_id)))

  const { data: primaryMusclesData, error: primaryMusclesError } = await supabase
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
  const lang = i18n.language?.split('-')[0] ?? 'fr'
  const locale = lang === 'en' ? 'en-CA' : lang === 'es' ? 'es-ES' : 'fr-CA'

  return new Date(dateIso).toLocaleString(locale, {
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
  workoutsFromCache: boolean
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
  body_region: 'full',
  movement_type: null,
  secondary_movements: [],
  methods: [],
  primary_muscle: 'core' as MuscleGroup,
  secondary_muscles: [],
  tertiary_muscles: [],
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
  workoutsFromCache: false,

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
            const previousZoneLabel = i18n.t(`labels.zones.${previousZone}`, { ns: 'common' })
            const expectedCardioLabel = i18n.t(MUSCLE_GROUP_I18N_KEYS[expectedCardio], {
              ns: 'common'
            })
            const cardioSequenceMessage = i18n.t('builder.cardio_sequence_message', {
              ns: 'workouts',
              previousZone: previousZoneLabel,
              previousExercise: previousExercise.name,
              expectedCardio: expectedCardioLabel,
              exercise: exercise.name
            })

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
          : i18n.t('builder.recently', { ns: 'workouts' })
        const recommendedText = restBlock.recommendedAt
          ? formatHumanDateTime(restBlock.recommendedAt)
          : i18n.t('builder.in_about_hours', {
              ns: 'workouts',
              hours: restBlock.hoursRemaining
            })
        const warningMessage = i18n.t('builder.rest48_warning_message', {
          ns: 'workouts',
          muscle: i18n.t(MUSCLE_GROUP_I18N_KEYS[exercise.primary_muscle], { ns: 'common' }),
          lastText,
          recommendedText,
          hoursRemaining: restBlock.hoursRemaining
        })
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
      const message = err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      set({
        error: i18n.t('errors.rule48_check_failed', {
          ns: 'workouts',
          message
        })
      })
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
    if (!name.trim()) throw new Error(i18n.t('errors.workout_name_required', { ns: 'workouts' }))
    if (exercises.length === 0) throw new Error(i18n.t('errors.add_at_least_one_exercise', { ns: 'workouts' }))

    set({ loadingSave: true, error: null })
    try {
      const userId = await getCurrentUserId()

      const { data: workoutRow, error } = await supabase
        .from('workouts')
        .insert({ title: name, method, duration_minutes: durationMinutes, notes, created_by: userId })
        .select()
        .single()

      if (error) throw error

      const exerciseRows = exercises.map((we) => ({
        workout_id: workoutRow.id,
        exercise_id: we.exercise.id,
        position: we.position,
        sets: we.sets,
        // La colonne `reps` est un `text` en base — elle doit pouvoir contenir
        // « 10-12 » ou « AMRAP ». Le constructeur saisit un nombre : on le
        // convertit ici plutôt que d'envoyer un JSON number dans une colonne texte.
        reps: we.reps != null ? String(we.reps) : null,
        weight: we.weight,
        rest_seconds: we.rest_seconds,
        notes: we.notes
      }))

      const { error: exError } = await supabase
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
        created_at: workoutRow.created_at,
        created_by: userId
      }

      set((s) => {
        const updated = [saved, ...s.savedWorkouts]
        saveToCache('workouts', updated)
        return { savedWorkouts: updated, loadingSave: false, ...DEFAULT_DRAFT }
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      set({ error: message, loadingSave: false })
      throw err
    }
  },

  fetchWorkouts: async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const lightweight = ((data ?? []) as WorkoutRow[]).map((w) => ({
        id: w.id,
        name: w.title,
        method: w.method,
        duration_minutes: w.duration_minutes,
        notes: w.notes,
        exercises: [],
        created_at: w.created_at,
        created_by: w.created_by ?? null
      }))

      saveToCache('workouts', lightweight)
      set({ savedWorkouts: lightweight, workoutsFromCache: false })
    } catch (err: unknown) {
      const cached = loadFromCache('workouts')
      if (cached && cached.length > 0) {
        set({ savedWorkouts: cached, workoutsFromCache: true })
      } else {
        set({ error: err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' }), workoutsFromCache: false })
      }
    }
  }
}))

export { EMPTY_EXERCISE }