import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Class, ClassInsert, ClassMember, VoteSession, VoteSessionInsert, VoteResult } from '../types'

interface ClassState {
  classes: Class[]
  members: Record<string, ClassMember[]>      // classId → members
  voteSessions: Record<string, VoteSession[]>  // classId → sessions
  voteResults: Record<string, VoteResult[]>    // sessionId → [{exercise_id, count}]
  userVotesBySession: Record<string, string[]> // sessionId → exerciseIds voted by current user
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
  fetchVoteResults: (sessionId: string) => Promise<void>

  // Athlete side
  fetchMyClasses: () => Promise<void>
  joinClass: (token: string) => Promise<Class>
  fetchOpenVoteSessions: () => Promise<VoteSession[]>
  fetchMyVotes: (sessionIds: string[]) => Promise<void>
}

type SupabaseLikeError = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

function getErrorMessage(err: unknown, fallback = 'Erreur'): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const e = err as SupabaseLikeError
    const parts = [e.message, e.details, e.hint, e.code ? `code=${e.code}` : null].filter(Boolean)
    if (parts.length > 0) return parts.join(' | ')
  }
  return fallback
}

async function getUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Non authentifié')
  return user.id
}

function createInviteToken(): string {
  // Avoid relying on a DB default for invite token generation.
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return uuid.replace(/-/g, '')
}

export const useClassStore = create<ClassState>((set) => ({
  classes: [],
  members: {},
  voteSessions: {},
  voteResults: {},
  userVotesBySession: {},
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
      set({ error: getErrorMessage(err), loading: false })
    }
  },

  createClass: async (data) => {
    set({ loading: true, error: null })
    try {
      const userId = await getUserId()
      const { data: row, error } = await (supabase as any)
        .from('classes')
        .insert({ ...data, coach_id: userId, invite_token: createInviteToken() })
        .select()
        .single()
      if (error) throw error
      set((s) => ({ classes: [row, ...s.classes], loading: false }))
      return row as Class
    } catch (err) {
      const message = getErrorMessage(err)
      set({ error: `Impossible de creer le cours: ${message}`, loading: false })
      throw new Error(`Impossible de creer le cours: ${message}`)
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
      set({ error: getErrorMessage(err), loading: false })
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
      set({ error: getErrorMessage(err) })
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
      set({ error: getErrorMessage(err) })
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
      set({ error: getErrorMessage(err) })
    }
  },

  createVoteSession: async (data) => {
    // Abort the request after 12 seconds to prevent infinite loading
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    try {
      const userId = await getUserId()
      const { data: row, error } = await (supabase as any)
        .from('vote_sessions')
        .insert({ ...data, coach_id: userId, status: 'open' })
        .select()
        .single()
        .abortSignal(controller.signal)
      clearTimeout(timeoutId)
      if (error) throw error
      if (!row) throw new Error('Aucune donnée retournée après la création du vote')
      const session = row as VoteSession
      set((s) => ({
        voteSessions: {
          ...s.voteSessions,
          [data.class_id]: [session, ...(s.voteSessions[data.class_id] ?? [])]
        }
      }))
      return session
    } catch (err) {
      clearTimeout(timeoutId)
      const message = getErrorMessage(err)
      set({ error: message })
      // Always throw a real Error so the modal can display the message
      throw new Error(message)
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

  // Fetch aggregated vote counts for a session (for coach results view)
  fetchVoteResults: async (sessionId) => {
    try {
      const { data, error } = await (supabase as any)
        .from('exercise_votes')
        .select('exercise_id')
        .eq('vote_session_id', sessionId)
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of (data ?? [])) {
        counts[row.exercise_id] = (counts[row.exercise_id] ?? 0) + 1
      }
      const results: VoteResult[] = Object.entries(counts)
        .map(([exercise_id, count]) => ({ exercise_id, count }))
        .sort((a, b) => b.count - a.count)
      set((s) => ({ voteResults: { ...s.voteResults, [sessionId]: results } }))
    } catch (err) {
      set({ error: getErrorMessage(err) })
    }
  },

  // Fetch current user's votes across multiple sessions (for "already voted" display)
  fetchMyVotes: async (sessionIds) => {
    if (sessionIds.length === 0) return
    try {
      const userId = await getUserId()
      const { data, error } = await (supabase as any)
        .from('exercise_votes')
        .select('exercise_id, vote_session_id')
        .in('vote_session_id', sessionIds)
        .eq('user_id', userId)
      if (error) throw error
      const bySession: Record<string, string[]> = {}
      // Initialize all sessions as empty (so we know they were fetched)
      for (const sid of sessionIds) bySession[sid] = []
      for (const row of (data ?? [])) {
        bySession[row.vote_session_id].push(row.exercise_id)
      }
      set((s) => ({ userVotesBySession: { ...s.userVotesBySession, ...bySession } }))
    } catch {
      // Non-critical — silently ignore
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
      set({ error: getErrorMessage(err), loading: false })
    }
  },

  joinClass: async (token) => {
    const userId = await getUserId()
    // Use SECURITY DEFINER RPC — direct SELECT is blocked by RLS for non-members
    const { data: rows, error: findError } = await (supabase as any)
      .rpc('get_class_by_invite_token', { p_token: token })
    const classRow = rows?.[0] ?? null
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
    const sessions = (data ?? []) as VoteSession[]
    // Also pre-fetch which sessions the user has already voted in
    if (sessions.length > 0) {
      const { data: myVotes } = await (supabase as any)
        .from('exercise_votes')
        .select('exercise_id, vote_session_id')
        .in('vote_session_id', sessions.map((s) => s.id))
        .eq('user_id', userId)
      const bySession: Record<string, string[]> = {}
      for (const s of sessions) bySession[s.id] = []
      for (const row of (myVotes ?? [])) {
        bySession[row.vote_session_id]?.push(row.exercise_id)
      }
      set((s) => ({ userVotesBySession: { ...s.userVotesBySession, ...bySession } }))
    }
    return sessions
  }
}))
