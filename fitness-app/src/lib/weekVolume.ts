import type { MuscleGroup } from '../types'
import { shiftDate } from './planWeek'

/**
 * Garde-fou de volume de la semaine (phase 2, 2.5). Même principe que la
 * règle des 48 h du créateur, appliqué au calendrier d'un cours :
 *  - « enchaîné » : un muscle principal travaillé deux jours de suite ;
 *  - « fréquent »  : un muscle principal travaillé 3 jours ou plus dans la semaine.
 * Le cardio (haut et bas du corps) n'est pas compté : ce n'est pas une charge
 * musculaire au sens de la récupération.
 */
export const FREQUENT_DAYS = 3
const IGNORED: MuscleGroup[] = ['cardio_upper', 'cardio_lower']

export interface DayLoad { date: string; primary: MuscleGroup[] }

export interface VolumeWarning {
  muscle: MuscleGroup
  kind: 'back_to_back' | 'frequent'
  /** Jours concernés, triés. */
  dates: string[]
}

/** Muscles principaux d'une liste d'exercices, sans doublon ni cardio. */
export function primaryMuscles(exercises: Array<{ primary_muscle: MuscleGroup }>): MuscleGroup[] {
  return [...new Set(exercises.map((e) => e.primary_muscle))].filter((m) => !IGNORED.includes(m))
}

export function weekWarnings(days: DayLoad[]): VolumeWarning[] {
  const byMuscle = new Map<MuscleGroup, Set<string>>()
  for (const d of days) {
    for (const m of d.primary) {
      if (IGNORED.includes(m)) continue
      if (!byMuscle.has(m)) byMuscle.set(m, new Set())
      byMuscle.get(m)!.add(d.date)
    }
  }
  const out: VolumeWarning[] = []
  for (const [muscle, set] of byMuscle) {
    const dates = [...set].sort()
    if (dates.length >= FREQUENT_DAYS) out.push({ muscle, kind: 'frequent', dates })
    const pairs = dates.filter((d) => set.has(shiftDate(d, 1)))
    if (pairs.length > 0) {
      const involved = [...new Set(pairs.flatMap((d) => [d, shiftDate(d, 1)]))].sort()
      out.push({ muscle, kind: 'back_to_back', dates: involved })
    }
  }
  // Les plus chargés d'abord, puis par nom de muscle pour un ordre stable.
  return out.sort((a, b) => b.dates.length - a.dates.length || a.muscle.localeCompare(b.muscle))
}

/**
 * Programmer ce WOD tel jour : quels muscles principaux sont déjà travaillés
 * la veille ou le lendemain ? Sert à prévenir avant d'enregistrer.
 */
export function conflictsFor(date: string, candidate: MuscleGroup[], days: DayLoad[]): Array<{ muscle: MuscleGroup; date: string }> {
  const near = [shiftDate(date, -1), shiftDate(date, 1)]
  const out: Array<{ muscle: MuscleGroup; date: string }> = []
  for (const d of days) {
    if (!near.includes(d.date)) continue
    for (const m of candidate) if (!IGNORED.includes(m) && d.primary.includes(m)) out.push({ muscle: m, date: d.date })
  }
  return out
}
