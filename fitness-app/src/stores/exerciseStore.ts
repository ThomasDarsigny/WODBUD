import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { uploadVideoToR2 } from '../lib/r2'
import type { Exercise, ExerciseInsert, ExerciseUpdate, MuscleGroup } from '../types'

type ExerciseMuscleRow = {
  muscle_group: MuscleGroup
  is_primary: boolean
}

type ExerciseRow = {
  id: string
  name: string
  description: string | null
  category: Exercise['category']
  video_url: string | null
  created_at: string
  updated_at: string
  exercise_muscles?: ExerciseMuscleRow[]
}

interface ExerciseState {
  exercises: Exercise[]
  loading: boolean
  error: string | null
  fetchExercises: () => Promise<void>
  createExercise: (data: ExerciseInsert, videoFile?: File) => Promise<Exercise>
  updateExercise: (id: string, data: ExerciseUpdate, videoFile?: File) => Promise<void>
  deleteExercise: (id: string) => Promise<void>
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  loading: false,
  error: null,

  fetchExercises: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await (supabase as any)
        .from('exercises')
        .select('*, exercise_muscles(muscle_group, is_primary)')
        .order('name', { ascending: true })

      if (error) throw error

      const exercises: Exercise[] = ((data ?? []) as ExerciseRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        category: row.category,
        primary_muscle:
          row.exercise_muscles?.find((m) => m.is_primary)?.muscle_group ?? 'core',
        secondary_muscles:
          row.exercise_muscles
            ?.filter((m) => !m.is_primary)
            .map((m) => m.muscle_group) ?? [],
        video_url: row.video_url ?? null,
        video_path: null,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))

      set({ exercises, loading: false })
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Erreur inconnue', loading: false })
    }
  },

  createExercise: async (data, videoFile) => {
    set({ loading: true, error: null })
    try {
      const { data: row, error } = await (supabase as any)
        .from('exercises')
        .insert({
          name: data.name,
          description: data.description,
          category: data.category
        })
        .select()
        .single()

      if (error) throw error

      const muscleRows = [
        { exercise_id: row.id, muscle_group: data.primary_muscle, is_primary: true },
        ...data.secondary_muscles.map((mg) => ({
          exercise_id: row.id,
          muscle_group: mg,
          is_primary: false
        }))
      ]
      const { error: muscleError } = await (supabase as any)
        .from('exercise_muscles')
        .insert(muscleRows)
      if (muscleError) throw muscleError

      let video_url: string | null = null
      if (videoFile) {
        const uploaded = await uploadVideoToR2(videoFile, row.id)
        video_url = uploaded.url

        await (supabase as any)
          .from('exercises')
          .update({ video_url })
          .eq('id', row.id)
      }

      const exercise: Exercise = {
        ...data,
        id: row.id,
        video_url,
        video_path: null,
        created_at: row.created_at,
        updated_at: row.updated_at
      }

      set((s) => ({
        exercises: [...s.exercises, exercise].sort((a, b) => a.name.localeCompare(b.name)),
        loading: false
      }))
      return exercise
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      set({ error: message, loading: false })
      throw err
    }
  },

  updateExercise: async (id, data, videoFile) => {
    set({ loading: true, error: null })
    try {
      const current = get().exercises.find((e) => e.id === id)
      if (!current) throw new Error('Exercise not found')

      let video_url = current.video_url

      if (videoFile) {
        const uploaded = await uploadVideoToR2(videoFile, id)
        video_url = uploaded.url
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      }
      if (data.name) updatePayload.name = data.name
      if (data.description !== undefined) updatePayload.description = data.description
      if (data.category) updatePayload.category = data.category
      if (videoFile) {
        updatePayload.video_url = video_url
      }

      const { error } = await (supabase as any)
        .from('exercises')
        .update(updatePayload)
        .eq('id', id)
      if (error) throw error

      if (data.primary_muscle || data.secondary_muscles) {
        await (supabase as any).from('exercise_muscles').delete().eq('exercise_id', id)

        const primary = data.primary_muscle ?? current.primary_muscle
        const secondary = data.secondary_muscles ?? current.secondary_muscles
        const muscleRows = [
          { exercise_id: id, muscle_group: primary, is_primary: true },
          ...secondary.map((mg) => ({ exercise_id: id, muscle_group: mg, is_primary: false }))
        ]
        const { error: me } = await (supabase as any)
          .from('exercise_muscles')
          .insert(muscleRows)
        if (me) throw me
      }

      set((s) => ({
        exercises: s.exercises.map((e) =>
          e.id === id
            ? { ...e, ...data, video_url, video_path: null, updated_at: new Date().toISOString() }
            : e
        ),
        loading: false
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      set({ error: message, loading: false })
      throw err
    }
  },

  deleteExercise: async (id) => {
    set({ loading: true, error: null })
    try {
      const { error } = await (supabase as any).from('exercises').delete().eq('id', id)
      if (error) throw error

      set((s) => ({
        exercises: s.exercises.filter((e) => e.id !== id),
        loading: false
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      set({ error: message, loading: false })
      throw err
    }
  }
}))