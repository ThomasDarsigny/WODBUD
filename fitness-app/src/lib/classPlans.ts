import { supabase } from './supabase'
import { getLocalUser } from './currentUser'
import { localDate } from './scheduledWorkouts'
import { notifyClass } from './push'

/**
 * Séances programmées par le coach pour un cours (migration 037).
 *
 * Chaque athlète en reçoit une copie dans sa propre planification ; le
 * coach lit ces copies (règle dédiée) pour savoir qui a fait la séance.
 */

/** Jours de plans passés gardés dans la vue du coach, pour voir qui a suivi. */
export const PAST_DAYS_SHOWN = 14

export interface ClassPlan {
  id: string
  scheduled_date: string
  title: string | null
  notes: string | null
  workout_id: string | null
  workout_title: string | null
  /** Athlètes ayant reçu la séance. */
  total: number
  /** Parmi eux, ceux qui l'ont faite. */
  done: number
}

type Row = {
  id: string
  scheduled_date: string
  title: string | null
  notes: string | null
  workout_id: string | null
  workouts: { title: string } | { title: string }[] | null
  scheduled_workouts: { session_id: string | null }[] | null
}

function first<T>(value: T | T[] | null): T | null {
  if (value === null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function fetchClassPlans(classId: string): Promise<ClassPlan[]> {
  const from = new Date()
  from.setDate(from.getDate() - PAST_DAYS_SHOWN)

  const { data, error } = await supabase
    .from('class_plans')
    .select('id, scheduled_date, title, notes, workout_id, workouts(title), scheduled_workouts(session_id)')
    .eq('class_id', classId)
    .gte('scheduled_date', localDate(from))
    .order('scheduled_date', { ascending: true })
  if (error) throw error

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const copies = row.scheduled_workouts ?? []
    return {
      id: row.id,
      scheduled_date: row.scheduled_date,
      title: row.title,
      notes: row.notes,
      workout_id: row.workout_id,
      workout_title: first(row.workouts)?.title ?? null,
      total: copies.length,
      done: copies.filter((c) => c.session_id !== null).length
    }
  })
}

export async function createClassPlan(input: {
  classId: string
  scheduledDate: string
  workoutId: string | null
  title: string | null
  notes: string | null
}): Promise<void> {
  const { data } = await getLocalUser()
  if (!data.user) throw new Error('Non authentifié')

  const { data: row, error } = await supabase
    .from('class_plans')
    .insert({
      class_id: input.classId,
      coach_id: data.user.id,
      scheduled_date: input.scheduledDate,
      workout_id: input.workoutId,
      title: input.title,
      notes: input.notes
    })
    .select('id')
    .single()
  if (error) throw error
  notifyClass(input.classId, 'plan', row.id)
}

export async function deleteClassPlan(id: string): Promise<void> {
  const { error } = await supabase.from('class_plans').delete().eq('id', id)
  if (error) throw error
}
