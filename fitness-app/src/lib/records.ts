import { supabase } from './supabase'

/**
 * Records personnels : un carnet de résultats par mouvement.
 *
 * On ne stocke que des résultats bruts (charge, répétitions, temps) ; le
 * record se calcule ici, à la lecture. La charge est toujours en kg en base,
 * l'unité affichée n'est qu'une préférence d'écran.
 */

export interface ExerciseResult {
  id: string
  exerciseId: string
  sessionId: string | null
  weightKg: number | null
  reps: number | null
  seconds: number | null
  performedAt: string
  notes: string | null
}

export interface ResultInput {
  exerciseId: string
  sessionId?: string | null
  weightKg?: number | null
  reps?: number | null
  seconds?: number | null
  performedAt?: string
  notes?: string | null
}

export interface ExerciseRecord {
  exerciseId: string
  /** Meilleure charge soulevée, quel que soit le nombre de répétitions. */
  bestWeight: ExerciseResult | null
  /** Meilleur 1RM estimé (Epley), en kg. */
  best1RM: number | null
  /** Plus de répétitions sans charge (tractions, burpees…). */
  bestReps: ExerciseResult | null
  /** Meilleur temps : le plus court. */
  bestTime: ExerciseResult | null
  count: number
  lastAt: string
}

/** Epley : au-delà de 12 répétitions l'estimation ne veut plus rien dire. */
export function estimate1RM(weightKg: number, reps: number | null): number | null {
  if (!(weightKg > 0)) return null
  const r = reps ?? 1
  if (r <= 1) return weightKg
  if (r > 12) return null
  return Math.round(weightKg * (1 + r / 30) * 10) / 10
}

export function summarize(results: ExerciseResult[]): ExerciseRecord[] {
  const by = new Map<string, ExerciseResult[]>()
  for (const r of results) {
    const list = by.get(r.exerciseId) ?? []
    list.push(r)
    by.set(r.exerciseId, list)
  }
  const out: ExerciseRecord[] = []
  for (const [exerciseId, list] of by) {
    let bestWeight: ExerciseResult | null = null
    let best1RM: number | null = null
    let bestReps: ExerciseResult | null = null
    let bestTime: ExerciseResult | null = null
    let lastAt = list[0].performedAt
    for (const r of list) {
      if (r.performedAt > lastAt) lastAt = r.performedAt
      if (r.weightKg !== null) {
        if (!bestWeight || r.weightKg > bestWeight.weightKg! || (r.weightKg === bestWeight.weightKg && (r.reps ?? 1) > (bestWeight.reps ?? 1))) bestWeight = r
        const e = estimate1RM(r.weightKg, r.reps)
        if (e !== null && (best1RM === null || e > best1RM)) best1RM = e
      } else if (r.reps !== null && r.seconds === null) {
        if (!bestReps || r.reps > bestReps.reps!) bestReps = r
      }
      if (r.seconds !== null && r.weightKg === null) {
        if (!bestTime || r.seconds < bestTime.seconds!) bestTime = r
      }
    }
    out.push({ exerciseId, bestWeight, best1RM, bestReps, bestTime, count: list.length, lastAt })
  }
  return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

/**
 * Le nouveau résultat bat-il le record d'avant? On compare dans la même
 * famille (charge, répétitions, temps) : 50 kg ne « bat » pas 3 min 20.
 */
export function isNewRecord(previous: ExerciseResult[], next: ExerciseResult): boolean {
  const same = previous.filter((r) => r.exerciseId === next.exerciseId && r.id !== next.id)
  if (same.length === 0) return false
  if (next.weightKg !== null) {
    const weights = same.filter((r) => r.weightKg !== null)
    return weights.length > 0 && next.weightKg > Math.max(...weights.map((r) => r.weightKg!))
  }
  if (next.seconds !== null) {
    const times = same.filter((r) => r.seconds !== null && r.weightKg === null)
    return times.length > 0 && next.seconds < Math.min(...times.map((r) => r.seconds!))
  }
  if (next.reps !== null) {
    const reps = same.filter((r) => r.reps !== null && r.weightKg === null && r.seconds === null)
    return reps.length > 0 && next.reps > Math.max(...reps.map((r) => r.reps!))
  }
  return false
}

/* ── Unités ─────────────────────────────────────────────────────────────── */

export type WeightUnit = 'kg' | 'lb'
const UNIT_KEY = 'wodbud_weight_unit'
const LB = 2.20462

export function readUnit(): WeightUnit {
  try { return localStorage.getItem(UNIT_KEY) === 'lb' ? 'lb' : 'kg' } catch { return 'kg' }
}

export function writeUnit(u: WeightUnit): void {
  try { localStorage.setItem(UNIT_KEY, u) } catch { /* mode privé */ }
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? Math.round(kg * 10) / 10 : Math.round(kg * LB)
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : Math.round((value / LB) * 100) / 100
}

/** « 3:20 » ou « 1:02:05 ». */
export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Accepte « 200 », « 3:20 » ou « 1:02:05 ». null si illisible. */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':')
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
  const n = parts.reduce((acc, p) => acc * 60 + Number(p), 0)
  return n > 0 ? n : null
}

/* ── Accès aux données ──────────────────────────────────────────────────── */

type Row = {
  id: string
  exercise_id: string
  session_id: string | null
  weight_kg: number | null
  reps: number | null
  seconds: number | null
  performed_at: string
  notes: string | null
}

const COLS = 'id, exercise_id, session_id, weight_kg, reps, seconds, performed_at, notes'

const fromRow = (r: Row): ExerciseResult => ({
  id: r.id,
  exerciseId: r.exercise_id,
  sessionId: r.session_id,
  weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
  reps: r.reps,
  seconds: r.seconds,
  performedAt: r.performed_at,
  notes: r.notes
})

export async function fetchMyResults(exerciseId?: string): Promise<ExerciseResult[]> {
  let q = supabase.from('exercise_results').select(COLS).order('performed_at', { ascending: false }).limit(1000)
  if (exerciseId) q = q.eq('exercise_id', exerciseId)
  const { data, error } = await q
  if (error) throw error
  return ((data ?? []) as Row[]).map(fromRow)
}

export async function addResults(inputs: ResultInput[]): Promise<ExerciseResult[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase
    .from('exercise_results')
    .insert(inputs.map((i) => ({
      exercise_id: i.exerciseId,
      session_id: i.sessionId ?? null,
      weight_kg: i.weightKg ?? null,
      reps: i.reps ?? null,
      seconds: i.seconds ?? null,
      ...(i.performedAt ? { performed_at: i.performedAt } : {}),
      notes: i.notes?.trim() || null
    })))
    .select(COLS)
  if (error) throw error
  return ((data ?? []) as Row[]).map(fromRow)
}

export async function deleteResult(id: string): Promise<void> {
  const { error } = await supabase.from('exercise_results').delete().eq('id', id)
  if (error) throw error
}

export async function fetchExerciseNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from('exercises').select('id, name').in('id', ids)
  if (error) throw error
  return new Map(((data ?? []) as Array<{ id: string; name: string }>).map((e) => [e.id, e.name]))
}

export interface ExerciseOption {
  id: string
  name: string
  timeBased: boolean
}

/** Toute la bibliothèque, pour choisir le mouvement d'un résultat noté à part. */
export async function fetchExerciseOptions(): Promise<ExerciseOption[]> {
  const { data, error } = await supabase.from('exercises').select('id, name, is_time_based').order('name')
  if (error) throw error
  return ((data ?? []) as Array<{ id: string; name: string; is_time_based: boolean | null }>)
    .map((e) => ({ id: e.id, name: e.name, timeBased: Boolean(e.is_time_based) }))
}
