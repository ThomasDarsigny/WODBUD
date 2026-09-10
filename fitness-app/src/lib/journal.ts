import { supabase } from './supabase'

/**
 * Journal des séances.
 *
 * `workout_sessions` enregistre depuis le début `performed_at`,
 * `active_minutes` et `notes`, mais rien ne les affichait : un athlète ne
 * pouvait pas revoir ce qu'il avait fait la semaine précédente. C'est ce que
 * cette lecture répare.
 *
 * La RLS `sessions: voir les siennes` limite déjà au propriétaire — aucun
 * filtre sur `user_id` n'est nécessaire ici, et en ajouter un donnerait la
 * fausse impression que c'est lui qui protège.
 */

export interface JournalEntry {
  id: string
  performed_at: string
  active_minutes: number
  duration_minutes: number | null
  notes: string | null
  /** Titre du WOD, ou nom de l'activité cardio, ou null pour une séance libre. */
  title: string | null
  kind: 'wod' | 'cardio' | 'free'
}

type Row = {
  id: string
  performed_at: string
  active_minutes: number
  duration_minutes: number | null
  notes: string | null
  workouts: { title: string } | { title: string }[] | null
  activity: { name: string } | { name: string }[] | null
}

/** PostgREST renvoie tantôt un objet, tantôt un tableau selon la cardinalité. */
function first<T>(value: T | T[] | null): T | null {
  if (value === null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function fetchJournal(limit = 100): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      'id, performed_at, active_minutes, duration_minutes, notes, workouts(title), activity:exercises!workout_sessions_activity_exercise_id_fkey(name)'
    )
    .order('performed_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const wod = first(row.workouts)
    const activity = first(row.activity)
    return {
      id: row.id,
      performed_at: row.performed_at,
      active_minutes: row.active_minutes,
      duration_minutes: row.duration_minutes,
      notes: row.notes,
      title: wod?.title ?? activity?.name ?? null,
      kind: wod ? 'wod' : activity ? 'cardio' : 'free'
    }
  })
}

/** Regroupe par mois, en conservant l'ordre décroissant. */
export function groupByMonth(
  entries: JournalEntry[],
  lang: string
): Array<{ key: string; label: string; entries: JournalEntry[]; minutes: number }> {
  const buckets = new Map<string, JournalEntry[]>()
  for (const e of entries) {
    const d = new Date(e.performed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const list = buckets.get(key)
    if (list) list.push(e)
    else buckets.set(key, [e])
  }

  return Array.from(buckets.entries()).map(([key, list]) => {
    const d = new Date(list[0].performed_at)
    return {
      key,
      label: d.toLocaleDateString(lang, { month: 'long', year: 'numeric' }),
      entries: list,
      minutes: list.reduce((sum, e) => sum + (e.active_minutes || 0), 0)
    }
  })
}
