import { supabase } from './supabase'
import { getLocalUser } from './currentUser'
import { bumpLoadText } from './progression'
import { shiftDate } from './planWeek'
import type { WeightUnit } from './records'
import type { Exercise, WorkoutMethod } from '../types'
import { createClassPlan } from './classPlans'

/**
 * Cycles (phase 2, 2.3) : un WOD de base répété N semaines, le même jour,
 * avec la charge qui monte d'une semaine à l'autre (+5 % haut du corps,
 * +10 % bas du corps, arrondi aux disques — voir progression.ts).
 * La semaine 1 reprend le WOD tel quel ; les suivantes en sont des copies.
 */
export interface CycleLine {
  exercise: Pick<Exercise, 'id' | 'name' | 'body_region' | 'primary_muscle' | 'equipment'>
  position: number
  sets: number | null
  reps: string | null
  weight: string | null
  rest_seconds: number | null
  notes: string | null
}

export interface CycleBase {
  id: string
  title: string
  method: WorkoutMethod
  duration_minutes: number | null
  notes: string | null
  lines: CycleLine[]
}

export interface CycleWeek {
  week: number
  date: string
  title: string
  /** Charges de la semaine, ligne par ligne (null : pas de charge en chiffres). */
  lines: Array<CycleLine & { weight: string | null }>
  /** Vrai si la semaine reprend le WOD de base sans copie. */
  reusesBase: boolean
}

export const MIN_WEEKS = 2
export const MAX_WEEKS = 12

/** Les semaines du cycle, charges recalculées, sans rien écrire. */
export function planCycle(base: CycleBase, firstDate: string, weeks: number, progress: boolean, unit: WeightUnit): CycleWeek[] {
  const n = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.round(weeks)))
  const out: CycleWeek[] = []
  let current = base.lines.map((l) => ({ ...l }))
  for (let w = 1; w <= n; w++) {
    if (w > 1 && progress) {
      current = current.map((l) => ({ ...l, weight: bumpLoadText(l.weight ?? undefined, l.exercise, unit) ?? l.weight }))
    }
    out.push({
      week: w,
      date: shiftDate(firstDate, 7 * (w - 1)),
      title: w === 1 ? base.title : `${base.title} · S${w}/${n}`,
      lines: current.map((l) => ({ ...l })),
      reusesBase: w === 1
    })
  }
  return out
}

/** Le cycle fait-il vraiment monter quelque chose ? (sinon, prévenir le coach) */
export function hasProgression(weeks: CycleWeek[]): boolean {
  if (weeks.length < 2) return false
  return weeks[0].lines.some((l, i) => weeks[weeks.length - 1].lines[i]?.weight !== l.weight)
}

/** Lit le WOD de base avec ses lignes, pour planifier le cycle. */
export async function fetchCycleBase(workoutId: string, exercises: Exercise[]): Promise<CycleBase | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, title, method, duration_minutes, notes, workout_exercises(position, sets, reps, weight, rest_seconds, notes, exercise_id)')
    .eq('id', workoutId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const lines = [...(data.workout_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((r): CycleLine | null => {
      const ex = byId.get(r.exercise_id)
      return ex ? { exercise: ex, position: r.position, sets: r.sets, reps: r.reps, weight: r.weight, rest_seconds: r.rest_seconds, notes: r.notes } : null
    })
    .filter((l): l is CycleLine => l !== null)
  return { id: data.id, title: data.title, method: data.method as WorkoutMethod, duration_minutes: data.duration_minutes, notes: data.notes, lines }
}

/**
 * Crée le cycle : une copie du WOD pour chaque semaine après la première,
 * puis une séance de cours par semaine. Une seule notification à la classe
 * (la première séance), pas une par semaine.
 */
export async function createCycle(classId: string, base: CycleBase, weeks: CycleWeek[], onProgress?: (done: number) => void): Promise<void> {
  const { data: auth } = await getLocalUser()
  if (!auth.user) throw new Error('not_authenticated')
  let done = 0
  for (const w of weeks) {
    let workoutId = base.id
    if (!w.reusesBase) {
      const { data: row, error } = await supabase
        .from('workouts')
        .insert({ title: w.title, method: base.method, duration_minutes: base.duration_minutes, notes: base.notes, created_by: auth.user.id })
        .select('id')
        .single()
      if (error) throw error
      workoutId = row.id
      const { error: exError } = await supabase.from('workout_exercises').insert(w.lines.map((l) => ({
        workout_id: workoutId,
        exercise_id: l.exercise.id,
        position: l.position,
        sets: l.sets,
        reps: l.reps,
        weight: l.weight,
        rest_seconds: l.rest_seconds,
        notes: l.notes
      })))
      if (exError) throw exError
    }
    await createClassPlan({ classId, scheduledDate: w.date, workoutId, title: w.reusesBase ? null : w.title, notes: null }, { notify: w.week === 1 })
    done += 1
    onProgress?.(done)
  }
}
