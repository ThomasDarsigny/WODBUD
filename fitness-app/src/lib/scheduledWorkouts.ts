import { supabase } from './supabase'

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
}

type Row = {
  id: string
  scheduled_date: string
  title: string | null
  notes: string | null
  workout_id: string | null
  session_id: string | null
  workouts: { title: string } | { title: string }[] | null
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

/**
 * Plans à venir, plus ceux des `OVERDUE_DAYS` derniers jours pas encore
 * faits. Un plan passé et fait n'apparaît plus ici : il est dans le journal.
 */
export async function fetchUpcoming(limit = 50): Promise<ScheduledEntry[]> {
  const today = localDate()
  const from = new Date()
  from.setDate(from.getDate() - OVERDUE_DAYS)

  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select('id, scheduled_date, title, notes, workout_id, session_id, workouts(title)')
    .gte('scheduled_date', localDate(from))
    .order('scheduled_date', { ascending: true })
    .limit(limit)
  if (error) throw error

  return ((data ?? []) as unknown as Row[])
    .filter((row) => row.scheduled_date >= today || row.session_id === null)
    .map((row) => ({
      id: row.id,
      scheduled_date: row.scheduled_date,
      title: row.title,
      notes: row.notes,
      workout_id: row.workout_id,
      workout_title: first(row.workouts)?.title ?? null,
      session_id: row.session_id
    }))
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
      const { data } = await supabase
        .from('scheduled_workouts')
        .select('id')
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
  } = await supabase.auth.getUser()
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
