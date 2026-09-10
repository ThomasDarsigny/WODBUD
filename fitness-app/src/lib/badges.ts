import { supabase } from './supabase'

/**
 * Badges de réussite.
 *
 * Distincts des rangs, et volontairement : les rangs mesurent le temps cumulé
 * et forment une échelle linéaire ; un badge récompense un fait ponctuel.
 * Aucun badge ne porte sur `total_minutes` — deux systèmes qui récompensent la
 * même chose se dévaluent l'un l'autre.
 *
 * Le catalogue vient de la table `badges`, comme les rangs viennent de `ranks` :
 * ajouter un badge est une ligne SQL, pas un déploiement. Le client ne fait que
 * présenter — c'est `wodbud_recalc_badges` qui décerne, côté serveur, parce
 * qu'un client ne doit pas pouvoir s'auto-attribuer une récompense.
 */

export interface Badge {
  key: string
  position: number
  family: BadgeFamily
  display_fr: string
  display_en: string
  display_es: string
  condition_fr: string
  condition_en: string
  condition_es: string
  icon: string
  threshold: number | null
  /** false = défini mais rien ne le mesure encore. Affiché « à venir ». */
  available: boolean
}

export type BadgeFamily =
  | 'assiduite'
  | 'volume'
  | 'endurance'
  | 'horaires'
  | 'variete'
  | 'communaute'
  | 'coach'
  | 'suivi'

/** Ordre d'affichage des familles. `suivi` en dernier : rien n'y est atteignable. */
export const BADGE_FAMILIES: BadgeFamily[] = [
  'assiduite',
  'volume',
  'endurance',
  'horaires',
  'variete',
  'communaute',
  'coach',
  'suivi'
]

export const BADGE_FAMILY_I18N_KEYS: Record<BadgeFamily, string> = {
  assiduite: 'badges.family.assiduite',
  volume: 'badges.family.volume',
  endurance: 'badges.family.endurance',
  horaires: 'badges.family.horaires',
  variete: 'badges.family.variete',
  communaute: 'badges.family.communaute',
  coach: 'badges.family.coach',
  suivi: 'badges.family.suivi'
}

export interface UnlockedBadge {
  badge_key: string
  unlocked_at: string
}

type Lang = 'fr' | 'en' | 'es'

function normalizeLang(lang: string): Lang {
  const base = lang.split('-')[0]
  return base === 'en' || base === 'es' ? base : 'fr'
}

export function badgeDisplay(badge: Badge, lang: string): string {
  const l = normalizeLang(lang)
  if (l === 'en') return badge.display_en
  if (l === 'es') return badge.display_es
  return badge.display_fr
}

export function badgeCondition(badge: Badge, lang: string): string {
  const l = normalizeLang(lang)
  if (l === 'en') return badge.condition_en
  if (l === 'es') return badge.condition_es
  return badge.condition_fr
}

export async function fetchBadgeCatalogue(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as Badge[]
}

export async function fetchUnlockedBadges(userId: string): Promise<UnlockedBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_key, unlocked_at')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as UnlockedBadge[]
}

/**
 * Demande au serveur de réévaluer et de décerner. Renvoie les clés
 * NOUVELLEMENT débloquées, pour que l'appelant puisse les annoncer au lieu de
 * rafraîchir une grille en silence.
 */
export async function recalcBadges(): Promise<string[]> {
  const { data, error } = await supabase.rpc('wodbud_recalc_badges')
  if (error) throw error
  // La fonction renvoie un `setof text`.
  if (!data) return []
  if (Array.isArray(data)) {
    return data
      .map((row) => (typeof row === 'string' ? row : (row as { badge_key?: string }).badge_key))
      .filter((k): k is string => typeof k === 'string')
  }
  return []
}

/**
 * Lit quelques badges par leur clé. Sert à l'écran de fin de séance, qui
 * connaît les clés débloquées mais pas leurs libellés.
 */
export async function fetchBadgesByKeys(keys: string[]): Promise<Badge[]> {
  if (keys.length === 0) return []
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .in('key', keys)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as Badge[]
}

/** Groupe le catalogue par famille, en conservant l'ordre déclaré. */
export function groupByFamily(badges: Badge[]): Array<{ family: BadgeFamily; badges: Badge[] }> {
  return BADGE_FAMILIES.map((family) => ({
    family,
    badges: badges.filter((b) => b.family === family)
  })).filter((g) => g.badges.length > 0)
}
