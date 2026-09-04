/**
 * Rangs WODBUD — lecture et calculs d'affichage.
 *
 * Aucun seuil n'est codé ici : l'échelle vient de la table `ranks`, et le
 * cumul de minutes vient de `profiles.total_minutes`, alimenté par le trigger
 * `wodbud_recalc_profile_totals`. Le client ne fait que présenter.
 */

export interface Rank {
  position: number
  key: string
  display_fr: string
  display_en: string
  display_es: string
  min_minutes: number
  color: string
  motto_fr: string | null
  motto_en: string | null
  motto_es: string | null
}

export interface RankProgress {
  current: Rank | null
  next: Rank | null
  /** Progression vers le rang suivant, 0 à 1. Vaut 1 au dernier rang. */
  ratio: number
  /** Minutes restantes avant le rang suivant. 0 au dernier rang. */
  remaining: number
}

type Lang = 'fr' | 'en' | 'es'

function normalizeLang(lang: string): Lang {
  const base = lang.split('-')[0]
  return base === 'en' || base === 'es' ? base : 'fr'
}

export function rankDisplay(rank: Rank, lang: string): string {
  const l = normalizeLang(lang)
  if (l === 'en') return rank.display_en
  if (l === 'es') return rank.display_es
  return rank.display_fr
}

/** Retombe sur le français : les devises EN/ES peuvent être vides. */
export function rankMotto(rank: Rank, lang: string): string | null {
  const l = normalizeLang(lang)
  if (l === 'en') return rank.motto_en || rank.motto_fr
  if (l === 'es') return rank.motto_es || rank.motto_fr
  return rank.motto_fr
}

export function computeProgress(ranks: Rank[], minutes: number): RankProgress {
  if (ranks.length === 0) return { current: null, next: null, ratio: 0, remaining: 0 }

  const sorted = [...ranks].sort((a, b) => a.min_minutes - b.min_minutes)
  const safeMinutes = Math.max(0, minutes)

  let current = sorted[0]
  for (const r of sorted) {
    if (r.min_minutes <= safeMinutes) current = r
    else break
  }

  const next = sorted.find((r) => r.min_minutes > safeMinutes) ?? null
  if (!next) return { current, next: null, ratio: 1, remaining: 0 }

  const span = next.min_minutes - current.min_minutes
  const done = safeMinutes - current.min_minutes
  return {
    current,
    next,
    ratio: span > 0 ? Math.min(1, Math.max(0, done / span)) : 0,
    remaining: Math.max(0, next.min_minutes - safeMinutes)
  }
}

/** « 45 min », « 3 h », « 3 h 20 ». */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} h` : `${h} h ${rest}`
}
