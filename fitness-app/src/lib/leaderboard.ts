import { supabase } from './supabase'

/**
 * Classement d'un cours.
 *
 * « Depuis toujours » lit directement les profils : `profiles_select_classmates`
 * et `profiles_select_coach_reads_members` en donnent l'accès. Semaine et mois
 * passent par `get_class_leaderboard_since`, parce que les séances sont privées
 * et que seule une somme par membre doit sortir de la base.
 *
 * Le tri se fait côté client : PostgREST ne trie pas de façon fiable sur une
 * colonne imbriquée, et un cours compte quelques dizaines de membres au plus.
 */

export type LeaderboardPeriod = 'week' | 'month' | 'all'

export interface LeaderboardRow {
  userId: string
  displayName: string | null
  /** Minutes de la période demandée : la semaine, ou le total. */
  minutes: number
  currentStreak: number
  longestStreak: number
  /** Rang dans le classement, à partir de 1. Les ex æquo partagent leur rang. */
  position: number
}

type ProfileRow = {
  athlete_id: string
  profiles:
    | { full_name: string | null; total_minutes: number; current_streak: number; longest_streak: number }
    | Array<{ full_name: string | null; total_minutes: number; current_streak: number; longest_streak: number }>
    | null
}

function first<T>(value: T | T[] | null): T | null {
  if (value === null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Lundi 0 h, heure locale de l'appareil. */
export function startOfWeekLocal(now = new Date()): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

/** Le 1er du mois à 0 h, heure locale de l'appareil. */
export function startOfMonthLocal(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

async function fetchAllTime(classId: string): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('class_members')
    .select('athlete_id, profiles(full_name, total_minutes, current_streak, longest_streak)')
    .eq('class_id', classId)
  if (error) throw error

  return ((data ?? []) as unknown as ProfileRow[])
    .map((r) => {
      const p = first(r.profiles)
      // Un profil illisible (RLS) arrive à null : on l'écarte plutôt que
      // d'afficher une ligne vide qui ferait croire à un bug.
      if (!p) return null
      return {
        userId: r.athlete_id,
        displayName: p.full_name,
        minutes: p.total_minutes ?? 0,
        currentStreak: p.current_streak ?? 0,
        longestStreak: p.longest_streak ?? 0,
        position: 0
      }
    })
    .filter((r): r is LeaderboardRow => r !== null)
}

async function fetchSince(classId: string, since: Date): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_class_leaderboard_since', {
    p_class_id: classId,
    p_since: since.toISOString()
  })
  if (error) throw error

  return (data ?? []).map((r) => ({
    userId: r.athlete_id,
    displayName: r.full_name,
    minutes: r.minutes,
    currentStreak: r.current_streak,
    longestStreak: r.longest_streak,
    position: 0
  }))
}

export async function fetchClassLeaderboard(
  classId: string,
  period: LeaderboardPeriod = 'all'
): Promise<LeaderboardRow[]> {
  const rows =
    period === 'week' ? await fetchSince(classId, startOfWeekLocal())
    : period === 'month' ? await fetchSince(classId, startOfMonthLocal())
    : await fetchAllTime(classId)
  return rankRows(rows)
}

/**
 * Trie par minutes puis par meilleure série, et attribue les positions.
 * Ex æquo : deux athlètes à 120 min sont tous deux 1ers, le suivant 3e.
 */
export function rankRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => b.minutes - a.minutes || b.longestStreak - a.longestStreak)
  let position = 0
  let previous: number | null = null
  return sorted.map((row, index) => {
    if (previous === null || row.minutes !== previous) position = index + 1
    previous = row.minutes
    return { ...row, position }
  })
}
