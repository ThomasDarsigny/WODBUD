import { shiftDate, weekStart } from './planWeek'

/**
 * Tendances sur quelques semaines (constat 08 de l'audit : tracer la
 * semaine, la fréquentation d'un cours, au lieu de tuiles de chiffres).
 */

/** Les lundis des `count` dernières semaines, la semaine en cours comprise, du plus ancien au plus récent. */
export function lastWeeks(count: number, today: string): string[] {
  const current = weekStart(today)
  return Array.from({ length: count }, (_, i) => shiftDate(current, -7 * (count - 1 - i)))
}

/** Somme des valeurs par semaine (lundi), dans l'ordre de `weeks`. Hors période : ignoré. */
export function totalsByWeek(rows: Array<{ date: string; value: number }>, weeks: string[]): number[] {
  const index = new Map(weeks.map((w, i) => [w, i]))
  const totals = weeks.map(() => 0)
  for (const r of rows) {
    const i = index.get(weekStart(r.date.slice(0, 10)))
    if (i !== undefined) totals[i] += r.value
  }
  return totals
}

/**
 * Plafond de l'axe : un nombre rond juste au-dessus du maximum, pair, pour
 * que la ligne du milieu tombe sur un entier (2, 4, 6 ou 10 × 10ⁿ).
 */
export function niceMax(max: number): number {
  if (max <= 2) return 2
  const power = 10 ** Math.floor(Math.log10(max))
  for (const step of [1, 2, 4, 6, 10]) if (step * power >= max && (step * power) % 2 === 0) return step * power
  return 10 * power
}
