import { supabase } from './supabase'

/**
 * Classement d'un cours.
 *
 * Aucun changement de schéma : la policy `profiles_select_classmates` autorise
 * déjà chaque athlète à lire le profil de ceux avec qui il partage un cours, et
 * `profiles_select_coach_reads_members` fait de même pour le coach. La donnée
 * était accessible depuis le début, rien ne l'affichait.
 *
 * Le tri se fait côté client : PostgREST ne trie pas de façon fiable sur une
 * colonne imbriquée, et un cours compte quelques dizaines de membres au plus.
 */

export interface LeaderboardRow {
  userId: string
  displayName: string | null
  totalMinutes: number
  currentStreak: number
  longestStreak: number
  /** Rang dans le classement, à partir de 1. Les ex æquo partagent leur rang. */
  position: number
}

type Row = {
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

export async function fetchClassLeaderboard(classId: string): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('class_members')
    .select('athlete_id, profiles(full_name, total_minutes, current_streak, longest_streak)')
    .eq('class_id', classId)
  if (error) throw error

  const rows = ((data ?? []) as unknown as Row[])
    .map((r) => {
      const p = first(r.profiles)
      // Un profil illisible (RLS) arrive à null : on l'écarte plutôt que
      // d'afficher une ligne vide qui ferait croire à un bug.
      if (!p) return null
      return {
        userId: r.athlete_id,
        displayName: p.full_name,
        totalMinutes: p.total_minutes ?? 0,
        currentStreak: p.current_streak ?? 0,
        longestStreak: p.longest_streak ?? 0,
        position: 0
      }
    })
    .filter((r): r is LeaderboardRow => r !== null)
    .sort((a, b) => b.totalMinutes - a.totalMinutes || b.longestStreak - a.longestStreak)

  // Ex æquo : deux athlètes à 120 min sont tous deux 1ers, le suivant 3e.
  let position = 0
  let previous: number | null = null
  rows.forEach((row, index) => {
    if (previous === null || row.totalMinutes !== previous) position = index + 1
    row.position = position
    previous = row.totalMinutes
  })

  return rows
}
