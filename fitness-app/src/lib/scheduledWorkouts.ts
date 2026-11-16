import { supabase } from './supabase'
import { getLocalUser } from './currentUser'
import { isNetworkError } from './network'
import { loadOffline, saveOffline } from './offlineCache'
import { prefetchSessionPacks } from './sessionPack'

/**
 * Volet « à venir » du journal.
 *
 * Distinct de `workout_sessions` (ce qui a été fait) : une séance
 * programmée n'a pas de minutes actives ni d'exercices cochés, la forcer
 * dans ce schéma créerait des lignes à moitié vides. Voir la migration
 * 026 pour le détail du choix.
 *
 * Un plan est relié à la séance effectuée qui l'a accomplie (`session_id`,
 * migration 034). Un plan passé non fait reste visible une semaine pour
 * qu'on puisse encore le lancer ou le retirer, puis sort de la liste.
 */

/** Jours pendant lesquels un plan passé non fait reste affiché. */
export const OVERDUE_DAYS = 7

export interface ScheduledEntry {
  id: string
  scheduled_date: string
  title: string | null
  notes: string | null
  workout_id: string | null
  /** Titre du workout lié, si `workout_id` est renseigné. */
  workout_title: string | null
  /** Séance effectuée qui a accompli ce plan, sinon null. */
  session_id: string | null
  /** Cours dont le coach a programmé cette séance, sinon null (plan perso). */
  class_name: string | null
  /** Plan de cours d'origine (pour le tableau blanc), sinon null. */
  class_plan_id: string | null
}

type Row = {
  id: string
  scheduled_date: string
  title: string | null
  notes: string | null
  workout_id: string | null
  session_id: string | null
  class_plan_id: string | null
  workouts: { title: string } | { title: string }[] | null
  class_plans:
    | { classes: { name: string } | { name: string }[] | null }
    | { classes: { name: string } | { name: string }[] | null }[]
    | null
}

function first<T>(value: T | T[] | null): T | null {
  if (value === null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Aujourd'hui en `YYYY-MM-DD`, dans le fuseau du navigateur — pas `toISOString()`,
 *  qui bascule en UTC et exclurait à tort une séance programmée ce soir. */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Premier jour encore affiché : `OVERDUE_DAYS` jours avant `now`. */
function overdueFrom(now: Date): string {
  const from = new Date(now)
  from.setDate(from.getDate() - OVERDUE_DAYS)
  return localDate(from)
}

/**
 * Ce que montre « à venir » un jour donné : les plans à partir d'aujourd'hui,
 * plus ceux des `OVERDUE_DAYS` derniers jours pas encore faits. Refait sur la
 * liste gardée quand le réseau manque, peut-être lue un autre jour.
 */
export function visibleUpcoming(entries: ScheduledEntry[], now = new Date()): ScheduledEntry[] {
  const today = localDate(now)
  const from = overdueFrom(now)
  return entries.filter((e) => e.scheduled_date >= from && (e.scheduled_date >= today || e.session_id === null))
}

/** Jours à venir dont le contenu des WODs est gardé sur l'appareil (A5). */
const PACK_DAYS = 7

/** WODs des séances pas encore faites d'aujourd'hui à `PACK_DAYS` jours. */
export function workoutsToPack(entries: ScheduledEntry[], now = new Date()): string[] {
  const today = localDate(now)
  const until = new Date(now)
  until.setDate(until.getDate() + PACK_DAYS)
  const last = localDate(until)
  return [...new Set(entries
    .filter((e) => e.session_id === null && e.workout_id && e.scheduled_date >= today && e.scheduled_date <= last)
    .map((e) => e.workout_id as string))]
}

/**
 * Plans à venir, plus ceux des `OVERDUE_DAYS` derniers jours pas encore
 * faits. Un plan passé et fait n'apparaît plus ici : il est dans le journal.
 *
 * Sans réseau : la dernière liste lue sur cet appareil (A5). En ligne, le
 * contenu des WODs des prochains jours est lu à l'avance, pour que « Faire
 * ce WOD » marche au sous-sol.
 */
export async function fetchUpcoming(limit = 50): Promise<ScheduledEntry[]> {
  const now = new Date()
  const { data: auth } = await getLocalUser()
  if (!auth.user) return []
  const offlineKey = `upcoming:${auth.user.id}`
  const saved = loadOffline<ScheduledEntry[]>(offlineKey)

  // Filtre explicite : un coach lit aussi les copies de ses athlètes
  // (pour le suivi, migration 037), elles n'ont rien à faire dans SON journal.
  // Avec une liste gardée, pas de nouvel essai (1 s, 2 s, 4 s) : sans réseau,
  // elle s'affiche tout de suite.
  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select('id, scheduled_date, title, notes, workout_id, session_id, class_plan_id, workouts(title), class_plans(classes(name))')
    .eq('user_id', auth.user.id)
    .gte('scheduled_date', overdueFrom(now))
    .order('scheduled_date', { ascending: true })
    .limit(limit)
    .retry(saved === null)
  if (error) {
    if (saved && isNetworkError(error)) return visibleUpcoming(saved.value, now)
    throw error
  }

  const entries: ScheduledEntry[] = ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    scheduled_date: row.scheduled_date,
    title: row.title,
    notes: row.notes,
    workout_id: row.workout_id,
    workout_title: first(row.workouts)?.title ?? null,
    session_id: row.session_id,
    class_name: first(first(row.class_plans)?.classes ?? null)?.name ?? null,
    class_plan_id: row.class_plan_id
  }))
  saveOffline(offlineKey, entries)
  void prefetchSessionPacks(workoutsToPack(entries, now))
  return visibleUpcoming(entries, now)
}

/**
 * Rattache une séance effectuée à un plan.
 *
 * Avec `scheduledId` : le plan depuis lequel la séance a été lancée.
 * Sans : le premier plan non fait du même jour pour le même workout — faire
 * le WOD prévu depuis la page Séance coche aussi le plan.
 *
 * Ne lève jamais : la séance est déjà enregistrée, un lien manqué ne doit
 * pas la faire passer pour un échec.
 */
export async function linkSessionToPlan(input: {
  sessionId: string
  scheduledId: string | null
  workoutId: string | null
  date: string
}): Promise<void> {
  try {
    let planId = input.scheduledId
    if (!planId) {
      if (!input.workoutId) return
      const { data: auth } = await getLocalUser()
      if (!auth.user) return
      const { data } = await supabase
        .from('scheduled_workouts')
        .select('id')
        .eq('user_id', auth.user.id)
        .eq('scheduled_date', input.date)
        .eq('workout_id', input.workoutId)
        .is('session_id', null)
        .order('created_at', { ascending: true })
        .limit(1)
      planId = data?.[0]?.id ?? null
      if (!planId) return
    }

    await supabase
      .from('scheduled_workouts')
      .update({ session_id: input.sessionId })
      .eq('id', planId)
      .is('session_id', null)
  } catch {
    // Voir plus haut : la séance compte quoi qu'il arrive.
  }
}

export interface ScheduleWorkoutInput {
  scheduled_date: string
  title?: string | null
  notes?: string | null
  workout_id?: string | null
}

export async function scheduleWorkout(input: ScheduleWorkoutInput): Promise<void> {
  const {
    data: { user }
  } = await getLocalUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('scheduled_workouts').insert({
    user_id: user.id,
    scheduled_date: input.scheduled_date,
    title: input.title || null,
    notes: input.notes || null,
    workout_id: input.workout_id || null
  })
  if (error) throw error
}

export async function deleteScheduledWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('scheduled_workouts').delete().eq('id', id)
  if (error) throw error
}
