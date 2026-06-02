import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Class, ClassInsert, ClassMember, VoteSession, VoteSessionInsert } from '../types'

interface ClassState {
  classes: Class[]
  members: Record<string, ClassMember[]>   // classId → members
  voteSessions: Record<string, VoteSession[]> // classId → sessions
  loading: boolean
  error: string | null

  fetchClasses: () => Promise<void>
  createClass: (data: ClassInsert) => Promise<Class>
  deleteClass: (id: string) => Promise<void>

  fetchMembers: (classId: string) => Promise<void>
  removeMember: (classId: string, athleteId: string) => Promise<void>

  fetchVoteSessions: (classId: string) => Promise<void>
  createVoteSession: (data: VoteSessionInsert) => Promise<VoteSession>
  closeVoteSession: (sessionId: string) => Promise<void>

  // Athlete side
  fetchMyClasses: () => Promise<void>
  joinClass: (token: string) => Promise<Class>
  fetchOpenVoteSessions: () => Promise<VoteSession[]>
}

async function getUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Non authentifié')
  return user.id
}

export const useClassStore = create<ClassState>((set, get) => ({
  classes: [],
  members: {},
  voteSessions: {},
  loading: false,
  error: null,

  fetchClasses: async () => {
    set({ loading: true, error: null })
    try {
      const userId = await getUserId()
      const { data, error } = await (supabase as any)
        .from('classes')
        .select('*')
        .eq('coach_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ classes: data ?? [], loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur', loading: false })
    }
  },

  createClass: async (data) => {
    set({ loading: true, error: null })
    try {
      const userId = await getUserId()
      const { data: row, error } = await (supabase as any)
        .from('classes')
        .insert({ ...data, coach_id: userId })
        .select()
        .single()
      if (error) throw error
      set((s) => ({ classes: [row, ...s.classes], loading: false }))
      return row as Class
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur', loading: false })
      throw err
    }
  },

  deleteClass: async (id) => {
    set({ loading: true, error: null })
    try {
      const { error } = await (supabase as any).from('classes').delete().eq('id', id)
      if (error) throw error
      set((s) => ({
        classes: s.classes.filter((c) => c.id !== id),
        loading: false
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur', loading: false })
      throw err
    }
  },

  fetchMembers: async (classId) => {
    try {
      const { data, error } = await (supabase as any)
        .from('class_members')
        .select('*, profile:profiles(full_name)')
        .eq('class_id', classId)
        .order('joined_at', { ascending: true })
      if (error) throw error
      set((s) => ({ members: { ...s.members, [classId]: data ?? [] } }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur' })
    }
  },

  removeMember: async (classId, athleteId) => {
    try {
      const { error } = await (supabase as any)
        .from('class_members')
        .delete()
        .eq('class_id', classId)
        .eq('athlete_id', athleteId)
      if (error) throw error
      set((s) => ({
        members: {
          ...s.members,
          [classId]: (s.members[classId] ?? []).filter((m) => m.athlete_id !== athleteId)
        }
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur' })
      throw err
    }
  },

  fetchVoteSessions: async (classId) => {
    try {
      const { data, error } = await (supabase as any)
        .from('vote_sessions')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
      if (error) throw error
      set((s) => ({ voteSessions: { ...s.voteSessions, [classId]: data ?? [] } }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur' })
    }
  },

  createVoteSession: async (data) => {
    try {
      const userId = await getUserId()
      const { data: row, error } = await (supabase as any)
        .from('vote_sessions')
        .insert({ ...data, coach_id: userId, status: 'open' })
        .select()
        .single()
      if (error) throw error
      const session = row as VoteSession
      set((s) => ({
        voteSessions: {
          ...s.voteSessions,
          [data.class_id]: [session, ...(s.voteSessions[data.class_id] ?? [])]
        }
      }))
      return session
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur' })
      throw err
    }
  },

  closeVoteSession: async (sessionId) => {
    try {
      const { error } = await (supabase as any)
        .from('vote_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId)
      if (error) throw error
      set((s) => {
        const updated = { ...s.voteSessions }
        for (const classId of Object.keys(updated)) {
          updated[classId] = updated[classId].map((vs) =>
            vs.id === sessionId ? { ...vs, status: 'closed' as const } : vs
          )
        }
        return { voteSessions: updated }
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur' })
      throw err
    }
  },

  fetchMyClasses: async () => {
    set({ loading: true, error: null })
    try {
      const userId = await getUserId()
      const { data, error } = await (supabase as any)
        .from('class_members')
        .select('class_id, joined_at, classes(*)')
        .eq('athlete_id', userId)
      if (error) throw error
      const classes = ((data ?? []) as any[]).map((row: any) => row.classes).filter(Boolean)
      set({ classes, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Erreur', loading: false })
    }
  },

  joinClass: async (token) => {
    const userId = await getUserId()
    const { data: classRow, error: findError } = await (supabase as any)
      .from('classes')
      .select('*')
      .eq('invite_token', token)
      .single()
    if (findError || !classRow) throw new Error('Lien d\'invitation invalide ou expiré')

    const { error: joinError } = await (supabase as any)
      .from('class_members')
      .upsert({ class_id: classRow.id, athlete_id: userId }, { onConflict: 'class_id,athlete_id', ignoreDuplicates: true })
    if (joinError) throw joinError

    return classRow as Class
  },

  fetchOpenVoteSessions: async () => {
    const userId = await getUserId()
    const { data, error } = await (supabase as any)
      .from('vote_sessions')
      .select('*, classes!inner(id, name, class_members!inner(athlete_id))')
      .eq('status', 'open')
      .eq('classes.class_members.athlete_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as VoteSession[]
  }
}))
