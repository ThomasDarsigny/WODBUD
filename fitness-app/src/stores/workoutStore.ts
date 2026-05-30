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

type WorkoutRow = {
  id: string
  name: string
  method: WorkoutMethod
  duration_minutes?: number
  notes?: string
  created_at: string
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
  addExercise: (exercise: Exercise) => void
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
  method: 'amrap',
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

  addExercise: (exercise) => {
    const exercises = [
      ...get().exercises,
      {
        id: uuid(),
        exercise,
        position: get().exercises.length + 1,
        sets: 3,
        reps: '10'
      }
    ]
    set({ exercises, muscleAlerts: computeMuscleAlerts(exercises) })
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
      const { data: workoutRow, error } = await (supabase as any)
        .from('workouts')
        .insert({ name, method, duration_minutes: durationMinutes, notes })
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
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
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
      set({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
  }
}))

export { EMPTY_EXERCISE }