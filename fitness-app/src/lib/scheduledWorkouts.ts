import { supabase } from './supabase'

/**
 * Volet « à venir » du journal.
 *
 * Distinct de `workout_sessions` (ce qui a été fait) : une séance
 * programmée n'a pas de minutes actives ni d'exercices cochés, la forcer
 * dans ce schéma créerait des lignes à moitié vides. Voir la migration
 * 026 pour le détail du choix.
 *
 * Volontairement pas de statut « fait / manqué » dans cette première
 * version : une date passée disparaît simplement de la liste plutôt que de
 * se transformer en avertissement. Marier planification et journal des
 * séances effectuées est un chantier à part, pas fait ici.
 */

export interface ScheduledEntry {
  id: string
  scheduled_date: string
  title: string | null
  notes: string | null
  workout_id: string | null
  /** Titre du workout lié, si `workout_id` est renseigné. */
  workout_title: string | null
}

type Row = {
  id: string
  scheduled_date: string
  title: string | null
  notes: string | null
  workout_id: string | null
  workouts: { title: string } | { title: string }[] | null
}

function first<T>(value: T | T[] | null): T | null {
  if (value === null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Aujourd'hui en `YYYY-MM-DD`, dans le fuseau du navigateur — pas `toISOString()`,
 *  qui bascule en UTC et exclurait à tort une séance programmée ce soir. */
function todayLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function fetchUpcoming(limit = 50): Promise<ScheduledEntry[]> {
  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select('id, scheduled_date, title, notes, workout_id, workouts(title)')
    .gte('scheduled_date', todayLocalDate())
    .order('scheduled_date', { ascending: true })
    .limit(limit)
  if (error) throw error

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    scheduled_date: row.scheduled_date,
    title: row.title,
    notes: row.notes,
    workout_id: row.workout_id,
    workout_title: first(row.workouts)?.title ?? null
  }))
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
