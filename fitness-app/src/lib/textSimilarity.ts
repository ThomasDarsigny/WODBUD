/**
 * Comparaison de noms d'exercices pour la détection de doublons de l'import OCR.
 *
 * Une comparaison en `===` sur le nom brut laisse passer « Back Squat » vs
 * « back squat » ou « Thruster » vs « Thrusters » — courant sur six ans de
 * feuilles écrites par des mains différentes.
 */

/** Minuscules, accents retirés, ponctuation aplatie, espaces normalisés. */
export function normalizeExerciseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Distance de Levenshtein classique — bornée par la longueur des deux noms, jamais énorme ici. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row.push(Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost))
    }
    prev = row
  }
  return prev[b.length]
}

export type NameMatch = 'exact' | 'similar' | 'none'

/**
 * `exact` après normalisation → doublon certain, décoché d'office.
 * `similar` → à 1-2 caractères près (pluriel, coquille) sur un nom assez
 * long pour que ce ne soit pas un hasard → flagué, mais laissé au choix du
 * coach : « Squat » et « Squats » ne sont pas forcément le même exercice
 * dans sa tête.
 */
export function matchAgainstExisting(name: string, existingNormalized: string[]): NameMatch {
  const n = normalizeExerciseName(name)
  if (n.length === 0) return 'none'
  if (existingNormalized.includes(n)) return 'exact'

  const threshold = n.length <= 6 ? 1 : 2
  for (const existing of existingNormalized) {
    if (Math.abs(existing.length - n.length) > threshold) continue
    if (levenshtein(n, existing) <= threshold) return 'similar'
  }
  return 'none'
}
