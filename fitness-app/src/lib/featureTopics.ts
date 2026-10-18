import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Thématiques à ajouter à l'app, soumises au vote de tous les comptes.
 *
 * L'admin les propose ; chaque compte choisit UNE seule thématique au total
 * (clé primaire sur `user_id`, migration 041) — voter ailleurs remplace le
 * choix. Les votes restent privés : seuls les décomptes sortent.
 */

export type FeatureTopicStatus = 'open' | 'closed' | 'done'

export interface FeatureTopic {
  id: string
  title: string
  description: string | null
  status: FeatureTopicStatus
  created_at: string
  votes: number
  is_mine: boolean
}

export async function fetchFeatureTopics(): Promise<FeatureTopic[]> {
  const { data, error } = await supabase.rpc('get_feature_topics')
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    status: row.status as FeatureTopicStatus,
    votes: Number(row.votes)
  }))
}

/** Remplace le choix précédent s'il y en a un. */
export async function voteForTopic(topicId: string): Promise<void> {
  const { data: { user } } = await getLocalUser()
  if (!user) throw new Error('Non authentifié')
  const { error } = await supabase
    .from('feature_topic_votes')
    .upsert({ user_id: user.id, topic_id: topicId }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function clearTopicVote(): Promise<void> {
  const { data: { user } } = await getLocalUser()
  if (!user) throw new Error('Non authentifié')
  const { error } = await supabase.from('feature_topic_votes').delete().eq('user_id', user.id)
  if (error) throw error
}

/* ── Admin ─────────────────────────────────────────────────────────── */

export async function createFeatureTopic(title: string, description: string): Promise<void> {
  const { error } = await supabase
    .from('feature_topics')
    .insert({ title: title.trim(), description: description.trim() || null })
  if (error) throw error
}

export async function setFeatureTopicStatus(id: string, status: FeatureTopicStatus): Promise<void> {
  const { error } = await supabase.from('feature_topics').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteFeatureTopic(id: string): Promise<void> {
  const { error } = await supabase.from('feature_topics').delete().eq('id', id)
  if (error) throw error
}
