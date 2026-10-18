import { supabase } from './supabase'
import { getLocalUser } from './currentUser'
import { startOfMonthLocal, startOfWeekLocal } from './leaderboard'
import { localDate } from './scheduledWorkouts'

/**
 * Vie d'une communauté (migration 043) : défis, fil d'activité et
 * réactions, classements, WOD épinglé, profil d'un membre, modération.
 *
 * Toutes les lectures passent par des fonctions de la base qui appliquent
 * la règle de confidentialité : rien d'un membre ne sort s'il ne partage
 * pas son rang dans la communauté, et rien du tout pour un non-membre.
 */

async function requireUserId(): Promise<string> {
  const { data: { user } } = await getLocalUser()
  if (!user) throw new Error('Non authentifié')
  return user.id
}

/* ── Défis ─────────────────────────────────────────────────────────── */

export interface CommunityChallenge {
  id: string
  title: string
  target_minutes: number
  starts_on: string
  ends_on: string
  progress_minutes: number
  contributors: number
}

export async function fetchChallenges(communityId: string): Promise<CommunityChallenge[]> {
  const { data, error } = await supabase.rpc('get_community_challenges', { p_community: communityId })
  if (error) throw error
  return data ?? []
}

export async function createChallenge(input: {
  communityId: string
  title: string
  targetMinutes: number
  startsOn: string
  endsOn: string
}): Promise<void> {
  const { error } = await supabase.from('community_challenges').insert({
    community_id: input.communityId,
    title: input.title.trim(),
    target_minutes: input.targetMinutes,
    starts_on: input.startsOn,
    ends_on: input.endsOn
  })
  if (error) throw error
}

export async function deleteChallenge(id: string): Promise<void> {
  const { error } = await supabase.from('community_challenges').delete().eq('id', id)
  if (error) throw error
}

export function challengeState(c: CommunityChallenge, today = localDate()): 'upcoming' | 'active' | 'done' {
  if (today < c.starts_on) return 'upcoming'
  if (today > c.ends_on) return 'done'
  return 'active'
}

/* ── Classement ────────────────────────────────────────────────────── */

export type CommunityPeriod = 'week' | 'month'

export interface CommunityLeaderRow {
  user_id: string
  display_name: string
  avatar_url: string | null
  minutes: number
  is_me: boolean
}

export async function fetchCommunityLeaderboard(communityId: string, period: CommunityPeriod): Promise<CommunityLeaderRow[]> {
  const since = period === 'week' ? startOfWeekLocal() : startOfMonthLocal()
  const { data, error } = await supabase.rpc('get_community_leaderboard_since', {
    p_community: communityId,
    p_since: since.toISOString()
  })
  if (error) throw error
  return data ?? []
}

/* ── WOD de la communauté ──────────────────────────────────────────── */

export interface CommunityWodDoer {
  user_id: string
  display_name: string
  avatar_url: string | null
  minutes: number
}

export interface CommunityWod {
  id: string
  workout_id: string
  title: string
  note: string | null
  pinned_at: string
  done_by: CommunityWodDoer[]
  i_did: boolean
}

export async function fetchCommunityWod(communityId: string): Promise<CommunityWod | null> {
  const { data, error } = await supabase.rpc('get_community_wod', { p_community: communityId })
  if (error) throw error
  const row = data?.[0]
  if (!row) return null
  return { ...row, done_by: (row.done_by ?? []) as unknown as CommunityWodDoer[] }
}

export async function pinCommunityWod(communityId: string, workoutId: string, title: string, note: string): Promise<void> {
  const { error } = await supabase.from('community_wods').insert({
    community_id: communityId,
    workout_id: workoutId,
    title,
    note: note.trim() || null
  })
  if (error) throw error
}

export async function unpinCommunityWod(id: string): Promise<void> {
  const { error } = await supabase.from('community_wods').delete().eq('id', id)
  if (error) throw error
}

/* ── Fil d'activité ────────────────────────────────────────────────── */

export type ReactionEmoji = 'fire' | 'muscle' | 'clap'
export const REACTIONS: Array<{ key: ReactionEmoji; glyph: string }> = [
  { key: 'fire', glyph: '🔥' },
  { key: 'muscle', glyph: '💪' },
  { key: 'clap', glyph: '👏' }
]

export interface FeedEvent {
  event_key: string
  kind: 'session' | 'rank' | 'badge'
  at: string
  user_id: string
  display_name: string
  avatar_url: string | null
  is_me: boolean
  title: string | null
  minutes: number | null
  badge_key: string | null
  rank_key: string | null
  fire: number
  muscle: number
  clap: number
  my_reactions: ReactionEmoji[]
}

export async function fetchFeed(communityId: string): Promise<FeedEvent[]> {
  const { data, error } = await supabase.rpc('get_community_feed', { p_community: communityId })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    kind: row.kind as FeedEvent['kind'],
    my_reactions: (row.my_reactions ?? []) as ReactionEmoji[]
  }))
}

export async function toggleReaction(communityId: string, eventKey: string, emoji: ReactionEmoji, on: boolean): Promise<void> {
  if (on) {
    const { error } = await supabase
      .from('community_reactions')
      .insert({ community_id: communityId, event_key: eventKey, emoji })
    if (error) throw error
  } else {
    const userId = await requireUserId()
    const { error } = await supabase
      .from('community_reactions')
      .delete()
      .eq('community_id', communityId)
      .eq('event_key', eventKey)
      .eq('emoji', emoji)
      .eq('user_id', userId)
    if (error) throw error
  }
}

/* ── Profil d'un membre ────────────────────────────────────────────── */

export interface MemberProfile {
  user_id: string
  display_name: string
  avatar_url: string | null
  role: 'member' | 'admin'
  is_owner: boolean
  visible: boolean
  rank_key: string | null
  total_minutes: number | null
  current_streak: number | null
  longest_streak: number | null
  social_links: Array<{ platform: string; url: string }>
  badges: Array<{ key: string; unlocked_at: string }>
}

export async function fetchMemberProfile(communityId: string, userId: string): Promise<MemberProfile | null> {
  const { data, error } = await supabase.rpc('get_community_member_profile', { p_community: communityId, p_user: userId })
  if (error) throw error
  const row = data?.[0]
  if (!row) return null
  return {
    ...row,
    role: row.role as MemberProfile['role'],
    social_links: (Array.isArray(row.social_links) ? row.social_links : []) as MemberProfile['social_links'],
    badges: (Array.isArray(row.badges) ? row.badges : []) as MemberProfile['badges']
  }
}

/* ── Modération ────────────────────────────────────────────────────── */

export async function setMemberRole(communityId: string, userId: string, role: 'member' | 'admin'): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .update({ role })
    .eq('community_id', communityId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)
  if (error) throw error
}

/** Lien d'invitation : passe par /communities/:id, qui choisit l'espace. */
export function inviteLink(communityId: string): string {
  return `${window.location.origin}/communities/${communityId}`
}
