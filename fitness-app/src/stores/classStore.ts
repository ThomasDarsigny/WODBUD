import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Class, ClassInsert, ClassMember, VoteSession, VoteSessionStatus, VoteSessionInsert, VoteResult, VoteOption } from '../types'

interface ClassState {
  classes: Class[]
  members: Record<string, ClassMember[]>      // classId → members
  voteSessions: Record<string, VoteSession[]>  // classId → sessions
  voteResults: Record<string, VoteResult[]>    // sessionId → lignes de la vue vote_results
  voteOptions: Record<string, VoteOption[]>    // sessionId → options colorées
  userVotesBySession: Record<string, string[]> // sessionId → vote_option_id choisi (0 ou 1 élément)
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
  deleteVoteSession: (sessionId: string) => Promise<void>
  fetchVoteResults: (sessionId: string) => Promise<void>
  fetchVoteOptions: (sessionId: string) => Promise<VoteOption[]>
  castVote: (sessionId: string, optionId: string, exerciseId: string) => Promise<void>

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
  voteOptions: {},
  userVotesBySession: {},
  loading: false,
  error: null,

  fetchClasses: async () => {
    set({ loading: true, error: null })
    try {
      const userId = await getUserId()
      const { data, error } = await supabase
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
      const { data: row, error } = await supabase
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
      throw new Error(`Impossible de creer le cours: ${message}`, { cause: err })
    }
  },

  deleteClass: async (id) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id)
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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
      const { data, error } = await supabase
        .from('vote_sessions')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
      if (error) throw error
      // `status` est un `text` en base, restreint par un CHECK. Le type métier
      // le réduit à 'open' | 'closed' : la conversion se fait ici, à la frontière.
      const sessions = ((data ?? []) as Array<Omit<VoteSession, 'status'> & { status: string }>)
        .map((row) => ({ ...row, status: row.status as VoteSessionStatus }))
      set((s) => ({ voteSessions: { ...s.voteSessions, [classId]: sessions } }))
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
      const { data: row, error } = await supabase
        .from('vote_sessions')
        .insert({ ...data, coach_id: userId, status: 'open' })
        .select()
        .abortSignal(controller.signal)
        .single()
      clearTimeout(timeoutId)
      if (error) throw error
      if (!row) throw new Error('Aucune donnée retournée après la création du vote')
      const session = row as VoteSession

      // Les options colorées sont la vraie source du vote depuis la migration
      // 004. `exercise_options` reste rempli pour ne rien casser, mais c'est
      // `vote_options` que lisent la vue et les écrans.
      const optionRows = (data.exercise_options ?? []).map((exerciseId, i) => ({
        vote_session_id: session.id,
        exercise_id: exerciseId,
        position: i + 1
      }))
      if (optionRows.length > 0) {
        const { error: optionsError } = await supabase
          .from('vote_options')
          .insert(optionRows)
        if (optionsError) throw optionsError
      }

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
      throw new Error(message, { cause: err })
    }
  },

  closeVoteSession: async (sessionId) => {
    try {
      const { error } = await supabase
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

  deleteVoteSession: async (sessionId) => {
    try {
      // Delete all votes for this session first, then the session itself
      await supabase.from('exercise_votes').delete().eq('vote_session_id', sessionId)
      const { error } = await supabase.from('vote_sessions').delete().eq('id', sessionId)
      if (error) throw error
      set((s) => {
        const updated = { ...s.voteSessions }
        for (const classId of Object.keys(updated)) {
          updated[classId] = updated[classId].filter((vs) => vs.id !== sessionId)
        }
        const results = { ...s.voteResults }
        delete results[sessionId]
        return { voteSessions: updated, voteResults: results }
      })
    } catch (err) {
      set({ error: getErrorMessage(err) })
      throw err
    }
  },

  // Résultats agrégés : libellé, couleur, décompte, pourcentage et « en tête »
  // viennent de la vue `vote_results` en une requête. Plus aucun comptage
  // côté client, donc plus de divergence possible entre coach et athlète.
  fetchVoteResults: async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('vote_results')
        .select('*')
        .eq('vote_session_id', sessionId)
        .order('position', { ascending: true })
      if (error) throw error
      // Toutes les colonnes d'une vue sont typées nullables par le générateur
      // Supabase : il ne peut pas prouver la non-nullité à travers un GROUP BY.
      // On normalise ici, et on écarte toute ligne sans identifiant d'option —
      // elle ne serait de toute façon pas affichable.
      const results: VoteResult[] = (data ?? [])
        .filter((r) => r.vote_option_id != null && r.vote_session_id != null)
        .map((r) => ({
          vote_session_id: r.vote_session_id as string,
          vote_option_id: r.vote_option_id as string,
          position: r.position ?? 0,
          label: r.label ?? '',
          color: r.color ?? 'var(--orange)',
          exercise_id: r.exercise_id,
          votes: Number(r.votes ?? 0),
          // PostgREST sérialise les `numeric` en chaîne : sans Number(), les
          // pourcentages se concatèneraient au lieu de s'additionner.
          percentage: Number(r.percentage ?? 0),
          is_leading: Boolean(r.is_leading)
        }))
      set((s) => ({ voteResults: { ...s.voteResults, [sessionId]: results } }))
    } catch (err) {
      set({ error: getErrorMessage(err) })
    }
  },

  fetchVoteOptions: async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('vote_options')
        .select('id, vote_session_id, exercise_id, label, color, position')
        .eq('vote_session_id', sessionId)
        .order('position', { ascending: true })
      if (error) throw error
      const options = (data ?? []) as VoteOption[]
      set((s) => ({ voteOptions: { ...s.voteOptions, [sessionId]: options } }))
      return options
    } catch (err) {
      set({ error: getErrorMessage(err) })
      return []
    }
  },

  // Un seul vote par athlète et par séance — c'est ce qu'impose l'index
  // `exercise_votes_one_per_session`. On retire l'ancien avant d'insérer le
  // nouveau, ce qui rend le changement d'avis possible sans violer l'index.
  castVote: async (sessionId, optionId, exerciseId) => {
    const userId = await getUserId()

    const { error: deleteError } = await supabase
      .from('exercise_votes')
      .delete()
      .eq('user_id', userId)
      .eq('vote_session_id', sessionId)
    if (deleteError) throw deleteError

    const { error: insertError } = await supabase
      .from('exercise_votes')
      .insert({
        user_id: userId,
        vote_session_id: sessionId,
        vote_option_id: optionId,
        exercise_id: exerciseId
      })
    if (insertError) throw insertError

    set((s) => ({
      userVotesBySession: { ...s.userVotesBySession, [sessionId]: [optionId] }
    }))
  },

  // Fetch current user's votes across multiple sessions (for "already voted" display)
  fetchMyVotes: async (sessionIds) => {
    if (sessionIds.length === 0) return
    try {
      const userId = await getUserId()
      const { data, error } = await supabase
        .from('exercise_votes')
        .select('vote_option_id, vote_session_id')
        .in('vote_session_id', sessionIds)
        .eq('user_id', userId)
      if (error) throw error
      const bySession: Record<string, string[]> = {}
      // Initialize all sessions as empty (so we know they were fetched)
      for (const sid of sessionIds) bySession[sid] = []
      for (const row of (data ?? [])) {
        if (row.vote_option_id && row.vote_session_id) {
          bySession[row.vote_session_id]?.push(row.vote_option_id)
        }
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
      const { data, error } = await supabase
        .from('class_members')
        .select('class_id, joined_at, classes(*)')
        .eq('athlete_id', userId)
      if (error) throw error
      const classes = (data ?? []).map((row) => row.classes).filter((c): c is Class => c != null)
      set({ classes, loading: false })
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false })
    }
  },

  joinClass: async (token) => {
    const userId = await getUserId()
    // Use SECURITY DEFINER RPC — direct SELECT is blocked by RLS for non-members
    const { data: rows, error: findError } = await supabase
      .rpc('get_class_by_invite_token', { p_token: token })
    const classRow = rows?.[0] ?? null
    if (findError || !classRow) throw new Error('Lien d\'invitation invalide ou expiré')

    const { error: joinError } = await supabase
      .from('class_members')
      .upsert({ class_id: classRow.id, athlete_id: userId }, { onConflict: 'class_id,athlete_id', ignoreDuplicates: true })
    if (joinError) throw joinError

    return classRow as Class
  },

  fetchOpenVoteSessions: async () => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('vote_sessions')
      .select('*, classes!inner(id, name, class_members!inner(athlete_id))')
      .eq('status', 'open')
      .eq('classes.class_members.athlete_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const sessions = (data ?? []) as VoteSession[]
    // Also pre-fetch which sessions the user has already voted in
    if (sessions.length > 0) {
      const { data: myVotes } = await supabase
        .from('exercise_votes')
        .select('vote_option_id, vote_session_id')
        .in('vote_session_id', sessions.map((s) => s.id))
        .eq('user_id', userId)
      const bySession: Record<string, string[]> = {}
      for (const s of sessions) bySession[s.id] = []
      for (const row of (myVotes ?? [])) {
        if (row.vote_option_id && row.vote_session_id) {
          bySession[row.vote_session_id]?.push(row.vote_option_id)
        }
      }
      set((s) => ({ userVotesBySession: { ...s.userVotesBySession, ...bySession } }))
    }
    return sessions
  }
}))
