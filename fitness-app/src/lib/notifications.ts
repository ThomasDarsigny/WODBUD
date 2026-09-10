import { supabase } from './supabase'

/**
 * Notifications in-app.
 *
 * Deux natures différentes, traitées différemment :
 *
 * - **Vote ouvert non voté** : entièrement DÉDUIT des données existantes.
 *   Rien à stocker, et la notification s'éteint d'elle-même dès que
 *   l'utilisateur vote. Un état « lu » serait ici une source de bugs.
 * - **Badge ou rang gagné** : reste vrai indéfiniment. Il faut mémoriser ce
 *   que l'utilisateur a déjà vu, d'où `profiles.badges_seen_at` et
 *   `profiles.rank_seen_key`.
 */

export interface NotificationCounts {
  /** Votes ouverts dans mes cours pour lesquels je n'ai pas encore voté. */
  openVotes: number
  /** Badges décernés depuis ma dernière visite de la collection. */
  newBadges: number
  /** Le rang courant diffère du dernier rang vu. */
  rankUp: boolean
}

export const NO_NOTIFICATIONS: NotificationCounts = {
  openVotes: 0,
  newBadges: 0,
  rankUp: false
}

export async function fetchNotifications(): Promise<NotificationCounts> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return NO_NOTIFICATIONS

  const [profileRes, votesRes, myVotesRes, badgesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('total_minutes, badges_seen_at, rank_seen_key')
      .eq('id', userId)
      .single(),
    // La RLS limite déjà aux cours dont je suis membre.
    supabase.from('vote_sessions').select('id').eq('status', 'open'),
    supabase.from('exercise_votes').select('vote_session_id').eq('user_id', userId),
    supabase.from('user_badges').select('unlocked_at').eq('user_id', userId)
  ])

  const profile = profileRes.data
  const openSessions = votesRes.data ?? []
  const votedOn = new Set((myVotesRes.data ?? []).map((v) => v.vote_session_id))
  const openVotes = openSessions.filter((s) => !votedOn.has(s.id)).length

  const seenAt = profile?.badges_seen_at ? new Date(profile.badges_seen_at).getTime() : 0
  const newBadges = (badgesRes.data ?? []).filter(
    (b) => new Date(b.unlocked_at).getTime() > seenAt
  ).length

  let rankUp = false
  if (profile) {
    const { data: currentKey } = await supabase.rpc('wodbud_rank_for_minutes', {
      p_minutes: profile.total_minutes ?? 0
    })
    // Un `rank_seen_key` absent veut dire « jamais consulté » : on ne notifie
    // pas, l'amorçage de la migration a rempli les profils existants.
    rankUp = Boolean(currentKey && profile.rank_seen_key && currentKey !== profile.rank_seen_key)
  }

  return { openVotes, newBadges, rankUp }
}

/** Marque la collection de badges et le rang courant comme vus. */
export async function acknowledgeProgress(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_minutes')
    .eq('id', userId)
    .single()

  const { data: currentKey } = await supabase.rpc('wodbud_rank_for_minutes', {
    p_minutes: profile?.total_minutes ?? 0
  })

  await supabase
    .from('profiles')
    .update({
      badges_seen_at: new Date().toISOString(),
      rank_seen_key: currentKey ?? null
    })
    .eq('id', userId)
}
