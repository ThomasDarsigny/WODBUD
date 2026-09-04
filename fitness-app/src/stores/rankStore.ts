import { create } from 'zustand'
import i18n from '../i18n'
import { supabase } from '../lib/supabase'
import type { Rank } from '../lib/ranks'

export interface RankProfile {
  full_name: string | null
  total_minutes: number
  current_streak: number
  longest_streak: number
}

interface RankState {
  ranks: Rank[]
  profile: RankProfile | null
  shareToken: string | null
  loading: boolean
  sharing: boolean
  error: string | null

  fetchAll: () => Promise<void>
  createShare: () => Promise<string | null>
  revokeShare: () => Promise<void>
}

export const useRankStore = create<RankState>((set, get) => ({
  ranks: [],
  profile: null,
  shareToken: null,
  loading: false,
  sharing: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const userId = userData.user?.id
      if (!userId) throw new Error(i18n.t('errors.not_authenticated', { ns: 'common' }))

      const [ranksRes, profileRes, shareRes] = await Promise.all([
        supabase.from('ranks').select('*').order('position', { ascending: true }),
        supabase
          .from('profiles')
          .select('full_name, total_minutes, current_streak, longest_streak')
          .eq('id', userId)
          .single(),
        supabase
          .from('rank_shares')
          .select('token')
          .eq('user_id', userId)
          .is('revoked_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
      ])

      if (ranksRes.error) throw ranksRes.error
      if (profileRes.error) throw profileRes.error

      set({
        ranks: (ranksRes.data ?? []) as Rank[],
        profile: profileRes.data as RankProfile,
        shareToken: shareRes.data?.[0]?.token ?? null,
        loading: false
      })
    } catch (err: unknown) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      })
    }
  },

  createShare: async () => {
    const existing = get().shareToken
    if (existing) return existing

    set({ sharing: true, error: null })
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error(i18n.t('errors.not_authenticated', { ns: 'common' }))

      // Le jeton est généré en base (gen_random_bytes) : rien de devinable
      // n'est fabriqué côté client.
      const { data, error } = await supabase
        .from('rank_shares')
        .insert({ user_id: userId })
        .select('token')
        .single()
      if (error) throw error

      set({ shareToken: data.token as string, sharing: false })
      return data.token as string
    } catch (err: unknown) {
      set({
        sharing: false,
        error: err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      })
      return null
    }
  },

  revokeShare: async () => {
    const token = get().shareToken
    if (!token) return
    set({ sharing: true, error: null })
    try {
      // Révocation plutôt que suppression : le lien cesse de répondre, et on
      // garde la trace qu'il a existé.
      const { error } = await supabase
        .from('rank_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token', token)
      if (error) throw error
      set({ shareToken: null, sharing: false })
    } catch (err: unknown) {
      set({
        sharing: false,
        error: err instanceof Error ? err.message : i18n.t('errors.generic', { ns: 'common' })
      })
    }
  }
}))
