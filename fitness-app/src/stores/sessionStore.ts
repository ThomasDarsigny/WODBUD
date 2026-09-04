import { create } from 'zustand'
import i18n from '../i18n'
import { supabase } from '../lib/supabase'
import {
  EMPTY_TIMER,
  activeMs,
  pauseTimer,
  resumeTimer,
  startTimer,
  toActiveMinutes,
  wallClockMs,
  type SessionTimer
} from '../lib/sessionTimer'

const STORAGE_KEY = 'wodbud_active_session'

export interface SessionExerciseItem {
  id: string
  exerciseId: string
  name: string
  position: number
  sets?: number | null
  reps?: string | null
  weight?: string | null
  rest_seconds?: number | null
}

export interface SessionSummary {
  activeMinutes: number
  totalMinutes: number
  currentStreak: number
}

/** Activité mesurée en durée : course, corde à sauter, rameur. */
export interface TimedActivity {
  id: string
  name: string
}

export const MAX_LOGGED_MINUTES = 600

/** Ce qui survit à un rechargement de page. */
interface PersistedSession {
  workoutId: string | null
  workoutName: string
  timer: SessionTimer
  doneExerciseIds: string[]
  notes: string
}

interface SessionState extends PersistedSession {
  items: SessionExerciseItem[]
  activities: TimedActivity[]
  loadingItems: boolean
  saving: boolean
  error: string | null
  lastSummary: SessionSummary | null

  restore: () => void
  startSession: (workoutId: string | null, workoutName: string) => void
  pause: () => void
  resume: () => void
  toggleExercise: (id: string) => void
  setNotes: (notes: string) => void
  loadItems: (workoutId: string) => Promise<void>
  finish: () => Promise<SessionSummary>
  discard: () => void
  clearSummary: () => void
  fetchActivities: () => Promise<void>
  logActivity: (input: { exerciseId: string | null; minutes: number; date: string }) => Promise<SessionSummary>
}

const IDLE: PersistedSession = {
  workoutId: null,
  workoutName: '',
  timer: EMPTY_TIMER,
  doneExerciseIds: [],
  notes: ''
}

function persist(s: PersistedSession) {
  try {
    if (s.timer.startedAt === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    }
  } catch {
    // Mode privé ou quota plein : la séance vit alors seulement en mémoire.
  }
}

function readPersisted(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedSession>
    if (!parsed?.timer?.startedAt) return null
    return {
      workoutId: parsed.workoutId ?? null,
      workoutName: parsed.workoutName ?? '',
      timer: {
        startedAt: parsed.timer.startedAt,
        accumulatedMs: parsed.timer.accumulatedMs ?? 0,
        runningSince: parsed.timer.runningSince ?? null
      },
      doneExerciseIds: parsed.doneExerciseIds ?? [],
      notes: parsed.notes ?? ''
    }
  } catch {
    return null
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user?.id) throw new Error(i18n.t('errors.not_authenticated', { ns: 'common' }))
  return data.user.id
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ...IDLE,
  items: [],
  activities: [],
  loadingItems: false,
  saving: false,
  error: null,
  lastSummary: null,

  restore: () => {
    const saved = readPersisted()
    if (!saved) return
    set({ ...saved })
    if (saved.workoutId) void get().loadItems(saved.workoutId)
  },

  startSession: (workoutId, workoutName) => {
    const next: PersistedSession = {
      workoutId,
      workoutName,
      timer: startTimer(),
      doneExerciseIds: [],
      notes: ''
    }
    persist(next)
    set({ ...next, items: [], error: null, lastSummary: null })
    if (workoutId) void get().loadItems(workoutId)
  },

  pause: () => {
    const s = get()
    if (s.timer.startedAt === null) return
    const timer = pauseTimer(s.timer)
    persist({ ...s, timer })
    set({ timer })
  },

  resume: () => {
    const s = get()
    if (s.timer.startedAt === null) return
    const timer = resumeTimer(s.timer)
    persist({ ...s, timer })
    set({ timer })
  },

  toggleExercise: (id) => {
    const s = get()
    const doneExerciseIds = s.doneExerciseIds.includes(id)
      ? s.doneExerciseIds.filter((x) => x !== id)
      : [...s.doneExerciseIds, id]
    persist({ ...s, doneExerciseIds })
    set({ doneExerciseIds })
  },

  setNotes: (notes) => {
    persist({ ...get(), notes })
    set({ notes })
  },

  loadItems: async (workoutId) => {
    set({ loadingItems: true })
    try {
      const { data: rows, error } = await supabase
        .from('workout_exercises')
        .select('id, exercise_id, position, sets, reps, weight, rest_seconds')
        .eq('workout_id', workoutId)
        .order('position', { ascending: true })
      if (error) throw error

      const list = (rows ?? []) as Array<{
        id: string
        exercise_id: string
        position: number
        sets: number | null
        reps: string | null
        weight: string | null
        rest_seconds: number | null
      }>

      if (list.length === 0) {
        set({ items: [], loadingItems: false })
        return
      }

      // Deux requêtes plutôt qu'une jointure imbriquée : c'est le patron déjà
      // utilisé dans workoutStore, et ça ne dépend pas du nommage PostgREST
      // des clés étrangères.
      const ids = Array.from(new Set(list.map((r) => r.exercise_id)))
      const { data: exRows, error: exError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', ids)
      if (exError) throw exError

      const names = new Map(
        ((exRows ?? []) as Array<{ id: string; name: string }>).map((e) => [e.id, e.name])
      )

      set({
        items: list.map((r) => ({
          id: r.id,
          exerciseId: r.exercise_id,
          name: names.get(r.exercise_id) ?? '—',
          position: r.position,
          sets: r.sets,
          reps: r.reps,
          weight: r.weight,
          rest_seconds: r.rest_seconds
        })),
        loadingItems: false
      })
    } catch (err: unknown) {
      set({
        loadingItems: false,
        error: err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      })
    }
  },

  finish: async () => {
    const s = get()
    if (s.timer.startedAt === null) throw new Error(i18n.t('errors.generic', { ns: 'common' }))

    set({ saving: true, error: null })
    try {
      const userId = await getCurrentUserId()
      const now = Date.now()
      const activeMinutes = toActiveMinutes(activeMs(s.timer, now))
      const durationMinutes = Math.round(wallClockMs(s.timer, now) / 60000)

      const { error } = await supabase.from('workout_sessions').insert({
        user_id: userId,
        workout_id: s.workoutId,
        started_at: s.timer.startedAt,
        ended_at: new Date(now).toISOString(),
        performed_at: s.timer.startedAt,
        duration_minutes: durationMinutes,
        active_minutes: activeMinutes,
        notes: s.notes.trim() || null
      })
      if (error) throw error

      // Le trigger wodbud_recalc_profile_totals s'exécute dans la même
      // transaction que l'insertion : la lecture qui suit voit déjà les totaux
      // à jour, aucun calcul de rang n'est refait côté client.
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_minutes, current_streak')
        .eq('id', userId)
        .single()

      const summary: SessionSummary = {
        activeMinutes,
        totalMinutes: profile?.total_minutes ?? activeMinutes,
        currentStreak: profile?.current_streak ?? 0
      }

      persist({ ...IDLE })
      set({ ...IDLE, items: [], saving: false, lastSummary: summary })
      return summary
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      set({ saving: false, error: message })
      throw err
    }
  },

  discard: () => {
    persist({ ...IDLE })
    set({ ...IDLE, items: [], error: null })
  },

  clearSummary: () => set({ lastSummary: null }),

  fetchActivities: async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .eq('is_time_based', true)
        .order('name', { ascending: true })
      if (error) throw error
      set({ activities: (data ?? []) as TimedActivity[] })
    } catch {
      // Sans la liste, le journal rapide reste utilisable en « autre ».
    }
  },

  /**
   * Journalise une activité déjà faite, sans chrono.
   *
   * Une course ou une corde à sauter ne se fait pas l'application ouverte.
   * Sans cette saisie, ce temps n'entrerait jamais dans `active_minutes` et
   * donc jamais dans les rangs. La date est reportée telle quelle dans
   * `started_at`, ce que le trigger de série lit pour compter les jours
   * consécutifs — une sortie d'hier prolonge donc correctement la série.
   */
  logActivity: async ({ exerciseId, minutes, date }) => {
    const safeMinutes = Math.round(minutes)
    if (!Number.isFinite(safeMinutes) || safeMinutes < 1 || safeMinutes > MAX_LOGGED_MINUTES) {
      throw new Error(i18n.t('session.log_invalid', { ns: 'workouts', max: MAX_LOGGED_MINUTES }))
    }

    set({ saving: true, error: null })
    try {
      const userId = await getCurrentUserId()

      // 12 h locale : au milieu de la journée, donc le décalage vers UTC ne
      // fait jamais basculer la séance sur la veille ou le lendemain.
      const startedAt = new Date(`${date}T12:00:00`)
      if (Number.isNaN(startedAt.getTime())) {
        throw new Error(i18n.t('session.log_invalid', { ns: 'workouts', max: MAX_LOGGED_MINUTES }))
      }
      const endedAt = new Date(startedAt.getTime() + safeMinutes * 60000)

      const { error } = await supabase.from('workout_sessions').insert({
        user_id: userId,
        workout_id: null,
        activity_exercise_id: exerciseId,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        performed_at: startedAt.toISOString(),
        duration_minutes: safeMinutes,
        active_minutes: safeMinutes,
        notes: null
      })
      if (error) throw error

      const { data: profile } = await supabase
        .from('profiles')
        .select('total_minutes, current_streak')
        .eq('id', userId)
        .single()

      const summary: SessionSummary = {
        activeMinutes: safeMinutes,
        totalMinutes: profile?.total_minutes ?? safeMinutes,
        currentStreak: profile?.current_streak ?? 0
      }
      set({ saving: false, lastSummary: summary })
      return summary
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      set({ saving: false, error: message })
      throw err
    }
  }
}))

/** Vrai si une séance est en cours (démarrée et non terminée). */
export function selectSessionActive(s: SessionState): boolean {
  return s.timer.startedAt !== null
}
