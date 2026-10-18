import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Membres d'une communauté (migration 042).
 *
 * Nom et avatar pour tout compte connecté ; rang, minutes, série et badges
 * seulement pour les membres qui partagent leur rang (`share_rank`), et
 * seulement vus par les autres membres. Le tri vient de la base : d'abord
 * ceux dont le rang est visible, du plus de minutes au moins.
 */
export interface CommunityMember {
  user_id: string
  display_name: string
  avatar_url: string | null
  joined_at: string
  is_me: boolean
  share_rank: boolean
  rank_key: string | null
  total_minutes: number | null
  current_streak: number | null
  badges: number | null
  role: 'member' | 'admin'
  /** Créateur de la communauté. */
  is_owner: boolean
}

export async function fetchCommunityMembers(communityId: string): Promise<CommunityMember[]> {
  const { data, error } = await supabase.rpc('get_community_members', { p_community: communityId })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    badges: row.badges === null ? null : Number(row.badges),
    role: row.role as CommunityMember['role']
  }))
}

export async function setShareRank(communityId: string, share: boolean): Promise<void> {
  const { data: { user } } = await getLocalUser()
  if (!user) throw new Error('Non authentifié')
  const { error } = await supabase
    .from('community_members')
    .update({ share_rank: share })
    .eq('community_id', communityId)
    .eq('user_id', user.id)
  if (error) throw error
}
