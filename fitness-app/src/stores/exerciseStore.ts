import { create } from 'zustand'
import i18n from '../i18n'
import { supabase } from '../lib/supabase'
import { R2NotConfiguredError, deleteVideoFromR2, uploadVideoToR2 } from '../lib/r2'
import { saveToCache, loadFromCache } from '../lib/offlineCache'
import type { TablesUpdate } from '../lib/database.types'
import type {
  BodyRegion,
  Exercise,
  ExerciseInsert,
  ExerciseUpdate,
  MovementType,
  MuscleGroup,
  TrainingMethod
} from '../types'
import { CORE_MUSCLES, LOWER_MUSCLES, MUSCLE_GROUP_LABELS, UPPER_MUSCLES } from '../types'

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
  body_region: BodyRegion | null
  movement_type: MovementType | null
  secondary_movements: MovementType[] | null
  video_url: string | null
  video_path: string | null
  created_at: string
  updated_at: string
  exercise_muscles?: ExerciseMuscleRow[]
  exercise_methods?: Array<{ method_key: TrainingMethod }>
}

/**
 * Téléverse la vidéo et renvoie de quoi remplir `video_url` / `video_path`.
 *
 * Si le stockage n'est pas encore configuré, on ne fait PAS échouer l'opération :
 * l'exercice que l'utilisateur vient de remplir vaut mieux que rien, et il
 * pourra rattacher la vidéo plus tard. Toute autre panne remonte normalement.
 */
async function tryUploadVideo(
  videoFile: File,
  exerciseId: string
): Promise<{ url: string; key: string } | { warning: string }> {
  try {
    const uploaded = await uploadVideoToR2(videoFile, exerciseId)
    return { url: uploaded.url, key: uploaded.key }
  } catch (err) {
    if (err instanceof R2NotConfiguredError) {
      return {
        warning: i18n.t('warnings.video_upload_skipped', {
          ns: 'exercises',
          reason: err.message
        })
      }
    }
    throw err
  }
}

/**
 * Supprime un objet R2 sans faire échouer l'appelant : la ligne en base est
 * déjà à jour, et une vidéo orpheline est un problème de ménage, pas de données.
 */
function discardVideo(key: string | null | undefined): void {
  if (!key) return
  void deleteVideoFromR2(key).catch((err: unknown) => {
    console.warn('[r2] vidéo non supprimée, objet orphelin:', key, err)
  })
}

interface ExerciseState {
  exercises: Exercise[]
  loading: boolean
  error: string | null
  /**
   * L'exercice a bien été enregistré mais sa vidéo n'a pas pu être téléversée.
   * Séparé de `error` : rien n'a échoué du point de vue de l'exercice, et le
   * formulaire s'est fermé — l'information doit survivre à sa fermeture.
   */
  videoWarning: string | null
  isFromCache: boolean
  fetchExercises: () => Promise<void>
  createExercise: (data: ExerciseInsert, videoFile?: File) => Promise<Exercise>
  updateExercise: (id: string, data: ExerciseUpdate, videoFile?: File) => Promise<void>
  deleteExercise: (id: string) => Promise<void>
  dismissVideoWarning: () => void
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (err.message.toLowerCase().includes('auth session missing')) {
      return i18n.t('errors.auth_session_missing_exercise', { ns: 'exercises' })
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
          return i18n.t('errors.auth_session_missing_exercise', { ns: 'exercises' })
        }
        return value
      }
    }
  }

  return i18n.t('errors.generic', { ns: 'common' })
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user?.id) {
    throw new Error(i18n.t('errors.invalid_session_reconnect', { ns: 'exercises' }))
  }

  return user.id
}

async function loadMuscleGroupMaps(): Promise<{
  idByKey: Map<MuscleGroup, string>
  keyById: Map<string, MuscleGroup>
}> {
  const { data, error } = await supabase.from('muscle_groups').select('id, name_key')
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
  if (nameKey === 'obliques') return 'obliques'
  if (nameKey === 'lower_back') return 'lower_back'

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

  if (muscle === 'obliques') {
    return idByKey.get('obliques')
  }

  if (muscle === 'lower_back') {
    return idByKey.get('lower_back')
  }

  if (muscle === 'quads') {
    return idByKey.get('quads')
  }

  return undefined
}

function getBodyRegionFromPrimaryMuscle(primaryMuscle: MuscleGroup): BodyRegion {
  if (CORE_MUSCLES.includes(primaryMuscle)) return 'core'
  if (UPPER_MUSCLES.includes(primaryMuscle)) return 'upper'
  if (LOWER_MUSCLES.includes(primaryMuscle)) return 'lower'
  return 'full'
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  loading: false,
  error: null,
  videoWarning: null,
  isFromCache: false,

  dismissVideoWarning: () => set({ videoWarning: null }),

  fetchExercises: async () => {
    set({ loading: true, error: null })
    try {
      const { keyById } = await loadMuscleGroupMaps()

      const { data, error } = await supabase
        .from('exercises')
        .select(
          '*, exercise_muscles(muscle_group_id, role, muscle_groups(name_key)), exercise_methods(method_key)'
        )
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
        tertiary_muscles:
          row.exercise_muscles
            ?.filter((m) => m.role === 'tertiary')
            .map((m) => extractNameKey(m.muscle_groups) ?? keyById.get(m.muscle_group_id))
            .filter((m): m is MuscleGroup => Boolean(m)) ?? [],
        body_region: row.body_region ?? 'full',
        movement_type: row.movement_type ?? null,
        secondary_movements: row.secondary_movements ?? [],
        methods: row.exercise_methods?.map((m) => m.method_key) ?? [],
        video_url: row.video_url ?? null,
        video_path: row.video_path ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))

      saveToCache('exercises', exercises)
      set({ exercises, loading: false, isFromCache: false })
    } catch (err: unknown) {
      const cached = loadFromCache('exercises')
      if (cached && cached.length > 0) {
        set({ exercises: cached, loading: false, error: null, isFromCache: true })
      } else {
        set({ error: extractErrorMessage(err), loading: false, isFromCache: false })
      }
    }
  },

  createExercise: async (data, videoFile) => {
    set({ loading: true, error: null })
    try {
      const userId = await getCurrentUserId()
      const { idByKey } = await loadMuscleGroupMaps()

      const { data: row, error } = await supabase
        .from('exercises')
        .insert({
          name: data.name,
          description: data.description,
          category: data.category,
          body_region: data.body_region ?? getBodyRegionFromPrimaryMuscle(data.primary_muscle),
          movement_type: data.movement_type ?? null,
          secondary_movements: data.secondary_movements ?? [],
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      const primaryMuscleId = resolveMuscleGroupId(idByKey, data.primary_muscle)
      if (!primaryMuscleId) {
        throw new Error(
          i18n.t('errors.primary_muscle_not_found', {
            ns: 'exercises',
            muscle: data.primary_muscle
          })
        )
      }

      const muscleRows = [
        { exercise_id: row.id, muscle_group_id: primaryMuscleId, role: 'primary' },
        ...data.secondary_muscles.map((mg) => ({
          exercise_id: row.id,
          muscle_group_id: resolveMuscleGroupId(idByKey, mg),
          role: 'secondary'
        })),
        ...(data.tertiary_muscles ?? []).map((mg) => ({
          exercise_id: row.id,
          muscle_group_id: resolveMuscleGroupId(idByKey, mg),
          role: 'tertiary'
        }))
      ].filter((row): row is { exercise_id: string; muscle_group_id: string; role: string } =>
        typeof row.muscle_group_id === 'string'
      )
      const { error: muscleError } = await supabase
        .from('exercise_muscles')
        .insert(muscleRows)
      if (muscleError) throw muscleError

      if (data.methods?.length) {
        const { error: methodError } = await supabase.from('exercise_methods').insert(
          data.methods.map((key, i) => ({
            exercise_id: row.id,
            method_key: key,
            is_primary: i === 0
          }))
        )
        if (methodError) throw methodError
      }

      let video_url: string | null = null
      let video_path: string | null = null
      let videoWarning: string | null = null

      if (videoFile) {
        const uploaded = await tryUploadVideo(videoFile, row.id)
        if ('warning' in uploaded) {
          videoWarning = uploaded.warning
        } else {
          video_url = uploaded.url
          video_path = uploaded.key

          await supabase
            .from('exercises')
            .update({ video_url, video_path })
            .eq('id', row.id)
        }
      }

      const exercise: Exercise = {
        ...data,
        id: row.id,
        video_url,
        video_path,
        created_at: row.created_at,
        updated_at: row.updated_at
      }

      set((s) => {
        const updated = [...s.exercises, exercise].sort((a, b) => a.name.localeCompare(b.name))
        saveToCache('exercises', updated)
        return { exercises: updated, loading: false, videoWarning }
      })
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
      let video_path = current.video_path ?? null
      let videoWarning: string | null = null

      // Mémorisée avant l'écrasement : c'est l'objet à supprimer si le
      // remplacement réussit. Sans ça, l'ancienne vidéo reste dans le bucket
      // pour toujours, sans plus rien qui pointe dessus.
      const previousKey = current.video_path ?? null

      if (videoFile) {
        const uploaded = await tryUploadVideo(videoFile, id)
        if ('warning' in uploaded) {
          videoWarning = uploaded.warning
        } else {
          video_url = uploaded.url
          video_path = uploaded.key
        }
      }

      const updatePayload: TablesUpdate<'exercises'> = {
        updated_at: new Date().toISOString()
      }
      if (data.name) updatePayload.name = data.name
      if (data.description !== undefined) updatePayload.description = data.description
      if (data.category) updatePayload.category = data.category
      if (data.body_region) {
        updatePayload.body_region = data.body_region
      } else if (data.primary_muscle) {
        updatePayload.body_region = getBodyRegionFromPrimaryMuscle(data.primary_muscle)
      }
      if (data.movement_type !== undefined) updatePayload.movement_type = data.movement_type
      if (data.secondary_movements !== undefined) {
        updatePayload.secondary_movements = data.secondary_movements
      }
      if (videoFile && video_path !== previousKey) {
        updatePayload.video_url = video_url
        updatePayload.video_path = video_path
      }

      const { error } = await supabase
        .from('exercises')
        .update(updatePayload)
        .eq('id', id)
      if (error) throw error

      if (data.methods !== undefined) {
        await supabase.from('exercise_methods').delete().eq('exercise_id', id)
        if (data.methods.length) {
          const { error: methodError } = await supabase.from('exercise_methods').insert(
            data.methods.map((key, i) => ({
              exercise_id: id,
              method_key: key,
              is_primary: i === 0
            }))
          )
          if (methodError) throw methodError
        }
      }

      if (data.primary_muscle || data.secondary_muscles || data.tertiary_muscles) {
        await supabase.from('exercise_muscles').delete().eq('exercise_id', id)

        const primary = data.primary_muscle ?? current.primary_muscle
        const secondary = data.secondary_muscles ?? current.secondary_muscles
        const tertiary = data.tertiary_muscles ?? current.tertiary_muscles ?? []
        const primaryMuscleId = resolveMuscleGroupId(idByKey, primary)
        if (!primaryMuscleId) {
          throw new Error(
            i18n.t('errors.primary_muscle_not_found', {
              ns: 'exercises',
              muscle: primary
            })
          )
        }

        const muscleRows = [
          { exercise_id: id, muscle_group_id: primaryMuscleId, role: 'primary' },
          ...secondary.map((mg) => ({
            exercise_id: id,
            muscle_group_id: resolveMuscleGroupId(idByKey, mg),
            role: 'secondary'
          })),
          ...tertiary.map((mg) => ({
            exercise_id: id,
            muscle_group_id: resolveMuscleGroupId(idByKey, mg),
            role: 'tertiary'
          }))
        ].filter((row): row is { exercise_id: string; muscle_group_id: string; role: string } =>
          typeof row.muscle_group_id === 'string'
        )
        const { error: me } = await supabase
          .from('exercise_muscles')
          .insert(muscleRows)
        if (me) throw me
      }

      // La base pointe désormais sur la nouvelle vidéo : l'ancienne n'est plus
      // référencée nulle part, on peut la libérer.
      if (previousKey && previousKey !== video_path) discardVideo(previousKey)

      set((s) => {
        const updated = s.exercises.map((e) =>
          e.id === id
            ? { ...e, ...data, video_url, video_path, updated_at: new Date().toISOString() }
            : e
        )
        saveToCache('exercises', updated)
        return { exercises: updated, loading: false, videoWarning }
      })
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: message, loading: false })
      throw err
    }
  },

  deleteExercise: async (id) => {
    set({ loading: true, error: null })
    try {
      // Relevée avant la suppression : après, plus rien ne dit où était la vidéo.
      const videoKey = get().exercises.find((e) => e.id === id)?.video_path ?? null

      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error

      discardVideo(videoKey)

      set((s) => {
        const updated = s.exercises.filter((e) => e.id !== id)
        saveToCache('exercises', updated)
        return { exercises: updated, loading: false }
      })
    } catch (err: unknown) {
      const message = extractErrorMessage(err)
      set({ error: message, loading: false })
      throw err
    }
  }
}))