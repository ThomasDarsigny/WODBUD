import { supabase } from './supabase'
import { loadOffline, saveOffline } from './offlineCache'
import type { WorkoutFormat } from './workoutClock'
import type { WorkoutMethod } from '../types'

/**
 * Ce qu'il faut pour suivre un WOD en séance : son format (chrono) et ses
 * mouvements, avec séries, répétitions, charges et repos.
 *
 * Gardé sur l'appareil à chaque lecture, et lu à l'avance pour les séances
 * programmées des prochains jours (scheduledWorkouts.ts) : au sous-sol d'une
 * box, « Faire ce WOD » marche sans réseau (A5).
 */

export interface SessionPackItem {
  id: string
  exerciseId: string
  name: string
  position: number
  sets: number | null
  reps: string | null
  weight: string | null
  rest_seconds: number | null
}

export interface SessionPack {
  format: WorkoutFormat | null
  items: SessionPackItem[]
}

/** Un contenu lu depuis moins longtemps n'est pas relu à l'avance. */
const FRESH_MS = 6 * 60 * 60 * 1000

const key = (workoutId: string) => `pack:${workoutId}`

/**
 * Lit le contenu d'un WOD et le garde. `retry: false` quand une copie existe
 * déjà : supabase-js réessaie sinon trois fois (1 s, 2 s, 4 s) avant de
 * conclure que le réseau manque.
 */
export async function fetchSessionPack(workoutId: string, { retry = true }: { retry?: boolean } = {}): Promise<SessionPack> {
  // Le format passe à part : une erreur (WOD d'une communauté quittée, par
  // exemple) laisse simplement le chrono simple.
  const formatQuery = supabase
    .from('workouts')
    .select('method, duration_minutes')
    .eq('id', workoutId)
    .maybeSingle()
    .retry(retry)
    .then(({ data }) => (data ? { method: data.method as WorkoutMethod, durationMinutes: data.duration_minutes ?? null } : null), () => null)

  const { data: rows, error } = await supabase
    .from('workout_exercises')
    .select('id, exercise_id, position, sets, reps, weight, rest_seconds')
    .eq('workout_id', workoutId)
    .order('position', { ascending: true })
    .retry(retry)
  if (error) throw error

  const list = rows ?? []
  let names = new Map<string, string>()
  if (list.length) {
    // Deux requêtes plutôt qu'une jointure imbriquée : c'est le patron déjà
    // utilisé dans workoutStore, et ça ne dépend pas du nommage PostgREST
    // des clés étrangères.
    const ids = Array.from(new Set(list.map((r) => r.exercise_id)))
    const { data: exRows, error: exError } = await supabase.from('exercises').select('id, name').in('id', ids).retry(retry)
    if (exError) throw exError
    names = new Map((exRows ?? []).map((e) => [e.id, e.name]))
  }

  const pack: SessionPack = {
    format: await formatQuery,
    items: list.map((r) => ({
      id: r.id,
      exerciseId: r.exercise_id,
      name: names.get(r.exercise_id) ?? '—',
      position: r.position,
      sets: r.sets,
      reps: r.reps,
      weight: r.weight,
      rest_seconds: r.rest_seconds
    }))
  }
  saveOffline(key(workoutId), pack)
  return pack
}

export function cachedSessionPack(workoutId: string): SessionPack | null {
  return loadOffline<SessionPack>(key(workoutId))?.value ?? null
}

const inFlight = new Set<string>()

/** Lit à l'avance les WODs qui n'ont pas de contenu récent. Sans erreur visible. */
export async function prefetchSessionPacks(workoutIds: string[], now = Date.now()): Promise<void> {
  const todo = [...new Set(workoutIds)].filter((id) => {
    const saved = loadOffline<SessionPack>(key(id))
    return !inFlight.has(id) && (!saved || now - saved.at > FRESH_MS)
  })
  await Promise.all(todo.map(async (id) => {
    inFlight.add(id)
    try {
      await fetchSessionPack(id)
    } catch {
      // Réessayé à la prochaine lecture des séances programmées.
    } finally {
      inFlight.delete(id)
    }
  }))
}
