import { supabase } from './supabase'
import type { WorkoutMethod } from '../types'
import type { WeightUnit } from './records'

/**
 * Score d'un WOD (065). La méthode du WOD décide de ce qu'on mesure :
 * For Time → temps ; AMRAP → rounds + reps ; EMOM, Tabata, Rounds → reps ;
 * Force → charge. « custom » laisse le choix. RX = tel que prescrit.
 */
export type ScoreType = 'time' | 'rounds_reps' | 'reps' | 'load'
export type Rx = 'rx' | 'scaled'

export interface Score {
  id?: string
  sessionId: string
  workoutId: string
  scoreType: ScoreType
  seconds?: number
  rounds?: number
  reps?: number
  loadKg?: number
  capped?: boolean
  rx: Rx
  note?: string
}

const LB = 2.20462

export const SCORE_TYPES: ScoreType[] = ['time', 'rounds_reps', 'reps', 'load']

/** Type de score naturel d'une méthode ; « custom » n'en impose aucun. */
export function scoreTypeFor(method: WorkoutMethod): ScoreType | null {
  switch (method) {
    case 'for_time': return 'time'
    case 'amrap': return 'rounds_reps'
    case 'emom':
    case 'tabata':
    case 'rounds': return 'reps'
    case 'strength': return 'load'
    default: return null
  }
}

/** « 6:12 », « 1:02:05 », « 372 » (secondes) → secondes, ou null si illisible. */
export function parseTime(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  const parts = t.split(':').map((p) => p.trim())
  if (parts.some((p) => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null
  const nums = parts.map(Number)
  let seconds: number
  if (nums.length === 1) seconds = nums[0]
  else if (nums.length === 2) seconds = nums[0] * 60 + nums[1]
  else if (nums.length === 3) seconds = nums[0] * 3600 + nums[1] * 60 + nums[2]
  else return null
  if (nums.length > 1 && nums.slice(1).some((n) => n >= 60)) return null
  seconds = Math.round(seconds)
  return seconds >= 1 && seconds <= 86400 ? seconds : null
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

/** Texte court du score, dans l'unité de la personne pour une charge. */
export function formatScore(score: Pick<Score, 'scoreType' | 'seconds' | 'rounds' | 'reps' | 'loadKg' | 'capped'>, unit: WeightUnit = 'kg'): string {
  switch (score.scoreType) {
    case 'time':
      return score.capped ? `${formatTime(score.seconds ?? 0)} (cap, ${score.reps ?? 0} reps)` : formatTime(score.seconds ?? 0)
    case 'rounds_reps':
      return score.reps ? `${score.rounds ?? 0} rds + ${score.reps}` : `${score.rounds ?? 0} rds`
    case 'reps':
      return `${score.reps ?? 0} reps`
    case 'load': {
      const kg = score.loadKg ?? 0
      const v = unit === 'kg' ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(kg * LB)} lb`
      return score.reps ? `${v} × ${score.reps}` : v
    }
  }
}

/**
 * Compare deux scores du même type : négatif si `a` est meilleur. Un temps
 * plus court gagne ; sous cap, un temps terminé bat un temps « capped », et
 * entre deux « capped », plus de reps gagne. Sinon, plus gagne. Égalité → 0.
 */
export function compareScores(a: Score, b: Score): number {
  if (a.scoreType !== b.scoreType) return 0
  switch (a.scoreType) {
    case 'time': {
      if (Boolean(a.capped) !== Boolean(b.capped)) return a.capped ? 1 : -1
      if (a.capped) return (b.reps ?? 0) - (a.reps ?? 0)
      return (a.seconds ?? 0) - (b.seconds ?? 0)
    }
    case 'rounds_reps':
      return ((b.rounds ?? 0) - (a.rounds ?? 0)) || ((b.reps ?? 0) - (a.reps ?? 0))
    case 'reps':
      return (b.reps ?? 0) - (a.reps ?? 0)
    case 'load':
      return ((b.loadKg ?? 0) - (a.loadKg ?? 0)) || ((b.reps ?? 0) - (a.reps ?? 0))
  }
}

/** Charge saisie dans l'unité affichée → kg, arrondi au centième. */
export function loadToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? Math.round(value * 100) / 100 : Math.round((value / LB) * 100) / 100
}

type Row = {
  id: string; session_id: string; workout_id: string; score_type: string
  seconds: number | null; rounds: number | null; reps: number | null; load_kg: number | null
  capped: boolean; rx: string; note: string | null
}

const fromRow = (r: Row): Score => ({
  id: r.id, sessionId: r.session_id, workoutId: r.workout_id, scoreType: r.score_type as ScoreType,
  seconds: r.seconds ?? undefined, rounds: r.rounds ?? undefined, reps: r.reps ?? undefined,
  loadKg: r.load_kg === null ? undefined : Number(r.load_kg), capped: r.capped, rx: r.rx as Rx, note: r.note ?? undefined
})

/** Enregistre ou remplace le score d'une séance (une séance = un score). */
export async function saveScore(score: Score): Promise<Score> {
  const { data, error } = await supabase.from('workout_scores').upsert({
    session_id: score.sessionId,
    workout_id: score.workoutId,
    score_type: score.scoreType,
    seconds: score.seconds ?? null,
    rounds: score.rounds ?? null,
    reps: score.reps ?? null,
    load_kg: score.loadKg ?? null,
    capped: score.capped ?? false,
    rx: score.rx,
    note: score.note?.trim() || null
  }, { onConflict: 'session_id' }).select().single()
  if (error) throw error
  return fromRow(data as Row)
}

/** Mes scores sur un WOD, du plus récent au plus ancien. */
export async function fetchMyScores(workoutId: string): Promise<Score[]> {
  const { data, error } = await supabase.from('workout_scores').select('*').eq('workout_id', workoutId).order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Row[]).map(fromRow)
}
