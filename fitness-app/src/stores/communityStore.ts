import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Community, CommunityInsert } from '../types'

/**
 * Communautés — ouvertes à tout compte, volontairement distinctes de
 * `classStore` (classes) : une classe est privée et rejointe par lien
 * d'invitation, une communauté est browsable et rejointe en un clic.
 * Voir la migration 029 pour le choix de ne pas restreindre la création.
 */

async function getUserId(): Promise<string> {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return user.id
}

interface CommunityState {
  communities: Community[]
  myCommunityIds: Set<string>
  loading: boolean
  error: string | null

  fetchCommunities: () => Promise<void>
  createCommunity: (data: CommunityInsert) => Promise<Community>
  deleteCommunity: (id: string) => Promise<void>
  joinCommunity: (id: string) => Promise<void>
  leaveCommunity: (id: string) => Promise<void>
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  communities: [],
  myCommunityIds: new Set(),
  loading: false,
  error: null,

  fetchCommunities: async () => {
    set({ loading: true, error: null })
    try {
      const userId = await getUserId().catch(() => null)

      const [{ data: communities, error: cErr }, { data: memberRows, error: mErr }] = await Promise.all([
        supabase
          .from('communities')
          .select('id, name, description, created_by, created_at, community_members(count)')
          .order('created_at', { ascending: false }),
        userId
          ? supabase.from('community_members').select('community_id').eq('user_id', userId)
          : Promise.resolve({ data: [] as { community_id: string }[], error: null })
      ])
      if (cErr) throw cErr
      if (mErr) throw mErr

      const myIds = new Set((memberRows ?? []).map((r) => r.community_id))

      const list: Community[] = ((communities ?? []) as unknown as Array<{
        id: string
        name: string
        description: string | null
        created_by: string
        created_at: string
        community_members: { count: number }[]
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        created_by: row.created_by,
        created_at: row.created_at,
        member_count: row.community_members?.[0]?.count ?? 0,
        is_member: myIds.has(row.id)
      }))

      set({ communities: list, myCommunityIds: myIds, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Erreur' })
    }
  },

  createCommunity: async (data) => {
    const userId = await getUserId()
    const { data: row, error } = await supabase
      .from('communities')
      .insert({ name: data.name, description: data.description, created_by: userId })
      .select()
      .single()
    if (error) throw error

    // Le créateur n'est pas membre d'office : rejoindre reste un geste
    // explicite, cohérent avec le reste de la fonctionnalité.
    await get().fetchCommunities()
    return row as Community
  },

  deleteCommunity: async (id) => {
    const { error } = await supabase.from('communities').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ communities: s.communities.filter((c) => c.id !== id) }))
  },

  joinCommunity: async (id) => {
    const userId = await getUserId()
    const { error } = await supabase.from('community_members').insert({ community_id: id, user_id: userId })
    if (error) throw error
    set((s) => ({
      myCommunityIds: new Set(s.myCommunityIds).add(id),
      communities: s.communities.map((c) =>
        c.id === id ? { ...c, is_member: true, member_count: (c.member_count ?? 0) + 1 } : c
      )
    }))
  },

  leaveCommunity: async (id) => {
    const userId = await getUserId()
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', id)
      .eq('user_id', userId)
    if (error) throw error
    set((s) => {
      const next = new Set(s.myCommunityIds)
      next.delete(id)
      return {
        myCommunityIds: next,
        communities: s.communities.map((c) =>
          c.id === id ? { ...c, is_member: false, member_count: Math.max(0, (c.member_count ?? 1) - 1) } : c
        )
      }
    })
  }
}))
