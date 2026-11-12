import type { Exercise, MuscleGroup } from '../types'
import type { WeightUnit } from './records'

/**
 * Progression de charge (point 5.4) : +5 % pour le haut du corps, +10 % pour
 * le bas du corps, arrondi à ce qu'on peut vraiment charger. La charge est en
 * kg en base ; l'arrondi se fait dans l'unité affichée (disques en kg ou en lb).
 */

const LB = 2.20462

export const UPPER_RATE = 0.05
export const LOWER_RATE = 0.1

const LOWER_MUSCLES = new Set<MuscleGroup>([
  'glutes', 'quads', 'hamstrings', 'adductors', 'calves', 'tibialis', 'lower_back', 'cardio_lower'
])

type Load = Pick<Exercise, 'body_region' | 'primary_muscle' | 'equipment'>

/** Taux selon la zone ; un mouvement « complet » ou de tronc suit son muscle principal. */
export function progressionRate(exercise: Load): number {
  if (exercise.body_region === 'lower') return LOWER_RATE
  if (exercise.body_region === 'upper') return UPPER_RATE
  return LOWER_MUSCLES.has(exercise.primary_muscle) ? LOWER_RATE : UPPER_RATE
}

/**
 * Plus petit saut possible. Barre : une paire des plus petits disques
 * (1,25 kg ou 2,5 lb de chaque côté). Haltères et kettlebells : l'écart
 * courant entre deux poids d'un râtelier.
 */
export function loadStep(exercise: Load, unit: WeightUnit): number {
  const eq = exercise.equipment ?? []
  if (eq.includes('kettlebells') && !eq.some((e) => e === 'barbell' || e === 'dumbbells')) return unit === 'kg' ? 4 : 10
  if (eq.includes('dumbbells') && !eq.includes('barbell')) return unit === 'kg' ? 2 : 5
  return unit === 'kg' ? 2.5 : 5
}

export interface NextLoad {
  /** Charge suggérée, dans l'unité affichée. */
  value: number
  /** La même, en kg (pour l'enregistrer). */
  kg: number
  /** Taux appliqué (0,05 ou 0,1). */
  rate: number
}

/**
 * Charge suivante : +5 % ou +10 %, arrondie au saut le plus proche, et
 * toujours au moins un saut au-dessus (sur une petite charge, 5 % ne
 * suffit pas à changer de disque).
 */
export function nextLoad(currentKg: number, exercise: Load, unit: WeightUnit = 'kg'): NextLoad | null {
  if (!Number.isFinite(currentKg) || currentKg <= 0) return null
  const rate = progressionRate(exercise)
  const step = loadStep(exercise, unit)
  const current = unit === 'kg' ? currentKg : currentKg * LB
  // Partir de la charge actuelle ramenée au saut, pour ne pas hériter d'un écart de conversion.
  const base = Math.round(current / step) * step
  const target = Math.round((current * (1 + rate)) / step) * step
  const value = Math.max(target, base + step)
  const kg = unit === 'kg' ? value : Math.round((value / LB) * 100) / 100
  return { value, kg, rate }
}

/**
 * Lit une charge saisie à la main dans le créateur (« 60kg », « 135 lb »,
 * « 62,5 »). Sans unité, on prend l'unité préférée. « BW », « 70%1RM »
 * ou un texte libre ne donnent rien.
 */
export function parseLoad(text: string | undefined, fallback: WeightUnit): { value: number; unit: WeightUnit; explicit: boolean } | null {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)?\s*$/i.exec(text ?? '')
  if (!m) return null
  const value = Number(m[1].replace(',', '.'))
  if (!(value > 0)) return null
  const unit: WeightUnit = m[2] ? (m[2].toLowerCase().startsWith('kg') ? 'kg' : 'lb') : fallback
  return { value, unit, explicit: Boolean(m[2]) }
}

/** « Trop facile » : la charge suivante, écrite comme la personne l'avait écrite. */
export function bumpLoadText(text: string | undefined, exercise: Load, fallback: WeightUnit): string | null {
  const load = parseLoad(text, fallback)
  if (!load) return null
  const kg = load.unit === 'kg' ? load.value : load.value / LB
  const next = nextLoad(kg, exercise, load.unit)
  if (!next) return null
  const comma = (text ?? '').includes(',')
  const num = String(next.value).replace('.', comma ? ',' : '.')
  return load.explicit ? `${num}${load.unit}` : num
}
