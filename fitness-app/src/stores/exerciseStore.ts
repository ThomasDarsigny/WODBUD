import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { uploadVideoToR2 } from '../lib/r2'
import type { Exercise, ExerciseInsert, ExerciseUpdate, MuscleGroup } from '../types'
import { LOWER_MUSCLES, MUSCLE_GROUP_LABELS, UPPER_MUSCLES } from '../types'

type ExerciseMuscleRow = {
  muscle_group_id: string
  role: string
  muscle_groups?: { name_key: string } | Array<{ name_key: string }> | null
}

type MuscleGroupRow = {
  id: string
  name_key: string
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

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (err.message.toLowerCase().includes('auth session missing')) {
      return 'Session manquante: reconnecte-toi pour creer ou modifier un exercice.'
    }
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
        if (value.toLowerCase().includes('auth session missing')) {
          return 'Session manquante: reconnecte-toi pour creer ou modifier un exercice.'
        }
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
    throw new Error("Session invalide: reconnecte-toi pour creer un exercice.")
  }

  return user.id
}

async function loadMuscleGroupMaps(): Promise<{
  idByKey: Map<MuscleGroup, string>
  keyById: Map<string, MuscleGroup>
}> {
  const { data, error } = await (supabase as any).from('muscle_groups').select('id, name_key')
  if (error) throw error

  const rows = (data ?? []) as MuscleGroupRow[]
  const idByKey = new Map<MuscleGroup, string>()
  const keyById = new Map<string, MuscleGroup>()

  for (const row of rows) {
    const appKey = toAppMuscleGroupKey(row.name_key)
    if (!appKey) continue

    idByKey.set(appKey, row.id)
    keyById.set(row.id, appKey)
  }

  return { idByKey, keyById }
}

function extractNameKey(
  muscleGroups: ExerciseMuscleRow['muscle_groups']
): MuscleGroup | undefined {
  if (!muscleGroups) return undefined
  if (Array.isArray(muscleGroups)) {
    return toAppMuscleGroupKey(muscleGroups[0]?.name_key)
  }
  return toAppMuscleGroupKey(muscleGroups.name_key)
}

function toAppMuscleGroupKey(nameKey: string | null | undefined): MuscleGroup | undefined {
  if (!nameKey) return undefined

  if (nameKey === 'abs') return 'core'
  if (nameKey === 'quadriceps') return 'quads'

  if (nameKey in MUSCLE_GROUP_LABELS) {
    return nameKey as MuscleGroup
  }

  return undefined
}

function resolveMuscleGroupId(
  idByKey: Map<MuscleGroup, string>,
  muscle: MuscleGroup
): string | undefined {
  const direct = idByKey.get(muscle)
  if (direct) return direct

  if (muscle === 'core') {
    return idByKey.get('core')
  }

  if (muscle === 'quads') {
    return idByKey.get('quads')
  }

  return undefined
}

function getBodyRegionFromPrimaryMuscle(primaryMuscle: MuscleGroup): 'upper' | 'lower' | 'full' {
  if (UPPER_MUSCLES.includes(primaryMuscle)) return 'upper'
  if (LOWER_MUSCLES.includes(primaryMuscle)) return 'lower'
  return 'full'
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  loading: false,
  error: null,

  fetchExercises: async () => {
    set({ loading: true, error: null })
    try {
      const { keyById } = await loadMuscleGroupMaps()

      const { data, error } = await (supabase as any)
        .from('exercises')
        .select('*, exercise_muscles(muscle_group_id, role, muscle_groups(name_key))')
        .order('name', { ascending: true })

      if (error) throw error

      const exercises: Exercise[] = ((data ?? []) as ExerciseRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        category: row.category,
        primary_muscle: (() => {
          const primaryRow = row.exercise_muscles?.find((m) => m.role === 'primary')
          const fromJoin = extractNameKey(primaryRow?.muscle_groups)
          if (fromJoin) return fromJoin
          const fromId = primaryRow?.muscle_group_id
            ? keyById.get(primaryRow.muscle_group_id)
            : undefined
          return fromId ?? 'core'
        })(),
        secondary_muscles:
          row.exercise_muscles
            ?.filter((m) => m.role === 'secondary')
            .map((m) => extractNameKey(m.muscle_groups) ?? keyById.get(m.muscle_group_id))
            .filter((m): m is MuscleGroup => Boolean(m)) ?? [],
        video_url: row.video_url ?? null,
        video_path: null,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))

      set({ exercises, loading: false })
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err), loading: false })
    }
  },

  createExercise: async (data, videoFile) => {
    set({ loading: true, error: null })
    try {
      const userId = await getCurrentUserId()
      const { idByKey } = await loadMuscleGroupMaps()

      const { data: row, error } = await (supabase as any)
        .from('exercises')
        .insert({
          name: data.name,
          description: data.description,
          category: data.category,
          body_region: getBodyRegionFromPrimaryMuscle(data.primary_muscle),
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      const primaryMuscleId = resolveMuscleGroupId(idByKey, data.primary_muscle)
      if (!primaryMuscleId) {
        throw new Error(`Muscle principal introuvable: ${data.primary_muscle}`)
      }

      const muscleRows = [
        { exercise_id: row.id, muscle_group_id: primaryMuscleId, role: 'primary' },
        ...data.secondary_muscles.map((mg) => ({
          exercise_id: row.id,
          muscle_group_id: resolveMuscleGroupId(idByKey, mg),
          role: 'secondary'
        }))
      ].filter((row) => Boolean(row.muscle_group_id))
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
      const message = extractErrorMessage(err)
      set({ error: message, loading: false })
      throw err
    }
  },

  updateExercise: async (id, data, videoFile) => {
    set({ loading: true, error: null })
    try {
      const { idByKey } = await loadMuscleGroupMaps()

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
      if (data.primary_muscle) {
        updatePayload.body_region = getBodyRegionFromPrimaryMuscle(data.primary_muscle)
      }
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
        const primaryMuscleId = resolveMuscleGroupId(idByKey, primary)
        if (!primaryMuscleId) {
          throw new Error(`Muscle principal introuvable: ${primary}`)
        }

        const muscleRows = [
          { exercise_id: id, muscle_group_id: primaryMuscleId, role: 'primary' },
          ...secondary.map((mg) => ({
            exercise_id: id,
            muscle_group_id: resolveMuscleGroupId(idByKey, mg),
            role: 'secondary'
          }))
        ].filter((row) => Boolean(row.muscle_group_id))
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
      const message = extractErrorMessage(err)
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
      const message = extractErrorMessage(err)
      set({ error: message, loading: false })
      throw err
    }
  }
}))