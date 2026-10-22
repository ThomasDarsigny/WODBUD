import { create } from 'zustand'
import i18n from '../i18n'
import { supabase } from '../lib/supabase'
import { getLocalUser } from '../lib/currentUser'
import { recalcBadges } from '../lib/badges'
import { linkSessionToPlan, localDate } from '../lib/scheduledWorkouts'
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
import type { WorkoutFormat } from '../lib/workoutClock'
import { addResults, fetchMyResults, isNewRecord, type ExerciseResult, type ResultInput } from '../lib/records'
import type { WorkoutMethod } from '../types'

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
  /** Clés des badges débloqués PAR cette séance. Vide la plupart du temps. */
  newBadges: string[]
  /**
   * Total AVANT la séance. Permet de comparer le rang d'avant et d'après sans
   * une requête de plus : le trigger ajoute exactement `activeMinutes`.
   */
  previousMinutes: number
  /** Records battus pendant la séance, avec le nom du mouvement. */
  newRecords: Array<{ name: string; result: ExerciseResult }>
}

/** Résultat noté pendant la séance, enregistré avec elle à la fin. */
export interface PendingResult extends ResultInput {
  key: string
}

/** Activité mesurée en durée : course, corde à sauter, rameur. */
export interface TimedActivity {
  id: string
  name: string
}

/** Ce qui survit à un rechargement de page. */
interface PersistedSession {
  workoutId: string | null
  workoutName: string
  /**
   * Renseigné pour une activité chronométrée (course, corde, rameur) plutôt
   * qu'un WOD. Les deux passent par le même chrono et le même `finish()` :
   * un seul chemin de sauvegarde, donc un seul endroit où un bug peut vivre.
   */
  activityId: string | null
  activityName: string
  /** Plan du journal depuis lequel la séance a été lancée, s'il y en a un. */
  scheduledId: string | null
  timer: SessionTimer
  doneExerciseIds: string[]
  notes: string
  pendingResults: PendingResult[]
}

interface SessionState extends PersistedSession {
  items: SessionExerciseItem[]
  /** Format du WOD (AMRAP 12, EMOM 10…), relu avec les exercices. */
  format: WorkoutFormat | null
  activities: TimedActivity[]
  loadingItems: boolean
  saving: boolean
  error: string | null
  lastSummary: SessionSummary | null

  restore: () => void
  startSession: (workoutId: string | null, workoutName: string, scheduledId?: string | null) => void
  /** Démarre le chrono sur une activité cardio, sans WOD. */
  startActivity: (activityId: string | null, activityName: string) => void
  pause: () => void
  resume: () => void
  toggleExercise: (id: string) => void
  setNotes: (notes: string) => void
  addPendingResult: (input: ResultInput) => void
  removePendingResult: (key: string) => void
  loadItems: (workoutId: string) => Promise<void>
  finish: () => Promise<SessionSummary>
  discard: () => void
  clearSummary: () => void
  fetchActivities: () => Promise<void>
}

const IDLE: PersistedSession = {
  workoutId: null,
  workoutName: '',
  activityId: null,
  activityName: '',
  scheduledId: null,
  timer: EMPTY_TIMER,
  doneExerciseIds: [],
  notes: '',
  pendingResults: []
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
      activityId: parsed.activityId ?? null,
      activityName: parsed.activityName ?? '',
      scheduledId: parsed.scheduledId ?? null,
      timer: {
        startedAt: parsed.timer.startedAt,
        accumulatedMs: parsed.timer.accumulatedMs ?? 0,
        runningSince: parsed.timer.runningSince ?? null
      },
      doneExerciseIds: parsed.doneExerciseIds ?? [],
      notes: parsed.notes ?? '',
      pendingResults: Array.isArray(parsed.pendingResults) ? parsed.pendingResults : []
    }
  } catch {
    return null
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await getLocalUser()
  if (error) throw error
  if (!data.user?.id) throw new Error(i18n.t('errors.not_authenticated', { ns: 'common' }))
  return data.user.id
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ...IDLE,
  items: [],
  format: null,
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

  startSession: (workoutId, workoutName, scheduledId = null) => {
    const next: PersistedSession = {
      ...IDLE,
      workoutId,
      workoutName,
      scheduledId,
      timer: startTimer()
    }
    persist(next)
    set({ ...next, items: [], format: null, error: null, lastSummary: null })
    if (workoutId) void get().loadItems(workoutId)
  },

  startActivity: (activityId, activityName) => {
    const next: PersistedSession = {
      ...IDLE,
      activityId,
      activityName,
      timer: startTimer()
    }
    persist(next)
    set({ ...next, items: [], format: null, error: null, lastSummary: null })
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

  addPendingResult: (input) => {
    const s = get()
    const pendingResults = [...s.pendingResults, { ...input, key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]
    persist({ ...s, pendingResults })
    set({ pendingResults })
  },

  removePendingResult: (key) => {
    const s = get()
    const pendingResults = s.pendingResults.filter((r) => r.key !== key)
    persist({ ...s, pendingResults })
    set({ pendingResults })
  },

  loadItems: async (workoutId) => {
    set({ loadingItems: true })
    // Le format passe à part : une erreur ici (WOD d'une communauté quittée,
    // par exemple) laisse simplement le chrono simple.
    void supabase
      .from('workouts')
      .select('method, duration_minutes')
      .eq('id', workoutId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || get().workoutId !== workoutId) return
        set({ format: { method: data.method as WorkoutMethod, durationMinutes: data.duration_minutes ?? null } })
      })
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

      const { data: inserted, error } = await supabase.from('workout_sessions').insert({
        user_id: userId,
        workout_id: s.workoutId,
        // Renseigné quand la séance est une activité cardio chronométrée.
        activity_exercise_id: s.activityId,
        started_at: s.timer.startedAt,
        ended_at: new Date(now).toISOString(),
        performed_at: s.timer.startedAt,
        duration_minutes: durationMinutes,
        active_minutes: activeMinutes,
        notes: s.notes.trim() || null
      }).select('id').single()
      if (error) throw error

      await linkSessionToPlan({
        sessionId: inserted.id,
        scheduledId: s.scheduledId,
        workoutId: s.workoutId,
        date: localDate(new Date(s.timer.startedAt))
      })

      // Le trigger wodbud_recalc_profile_totals s'exécute dans la même
      // transaction que l'insertion : la lecture qui suit voit déjà les totaux
      // à jour, aucun calcul de rang n'est refait côté client.
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_minutes, current_streak')
        .eq('id', userId)
        .single()

      // Décerné APRÈS l'insertion : la fonction lit les totaux que le trigger
      // vient de mettre à jour. Un échec ici ne doit pas perdre la séance,
      // qui est déjà enregistrée — d'où le repli silencieux.
      let newBadges: string[] = []
      try {
        newBadges = await recalcBadges()
      } catch {
        // Les badges seront rattrapés à l'ouverture de « Mon rang ».
      }

      // Les résultats notés partent avec la séance. Un échec ne la perd pas :
      // elle est déjà enregistrée, seuls les résultats seraient à renoter.
      const newRecords: SessionSummary['newRecords'] = []
      if (s.pendingResults.length) {
        try {
          const ids = new Set(s.pendingResults.map((r) => r.exerciseId))
          const previous = (await fetchMyResults()).filter((r) => ids.has(r.exerciseId))
          const saved = await addResults(s.pendingResults.map((r) => ({
            exerciseId: r.exerciseId, weightKg: r.weightKg, reps: r.reps, seconds: r.seconds, notes: r.notes, sessionId: inserted.id
          })))
          const nameOf = new Map(s.items.map((i) => [i.exerciseId, i.name]))
          for (const r of saved) {
            if (isNewRecord(previous, r)) newRecords.push({ name: nameOf.get(r.exerciseId) ?? '—', result: r })
          }
        } catch {
          // Voir plus haut : la séance compte quand même.
        }
      }

      const totalMinutes = profile?.total_minutes ?? activeMinutes
      const summary: SessionSummary = {
        activeMinutes,
        totalMinutes,
        currentStreak: profile?.current_streak ?? 0,
        newBadges,
        newRecords,
        previousMinutes: Math.max(0, totalMinutes - activeMinutes)
      }

      persist({ ...IDLE })
      set({ ...IDLE, items: [], format: null, saving: false, lastSummary: summary })
      return summary
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      set({ saving: false, error: message })
      throw err
    }
  },

  discard: () => {
    persist({ ...IDLE })
    set({ ...IDLE, items: [], format: null, error: null })
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

}))

/** Vrai si une séance est en cours (démarrée et non terminée). */
export function selectSessionActive(s: SessionState): boolean {
  return s.timer.startedAt !== null
}
