import { supabase } from './supabase'
import type { Rx, ScoreType } from './scores'

/**
 * Tableau blanc d'une séance de cours (066) : les scores de ceux qui l'ont
 * faite, et les « bravos ». Lecture par fonction dédiée : un membre ou le
 * coach du cours seulement, et seulement les scores rattachés à ce plan.
 */
export const REACTIONS = ['👏', '🔥', '💪'] as const
export type Reaction = (typeof REACTIONS)[number]

export interface WhiteboardRow {
  scoreId: string
  athleteId: string
  fullName: string | null
  avatarUrl: string | null
  scoreType: ScoreType
  seconds?: number
  rounds?: number
  reps?: number
  loadKg?: number
  capped: boolean
  rx: Rx
  note: string | null
  performedAt: string
  reactions: number
  myReaction: Reaction | null
}

export async function fetchWhiteboard(planId: string): Promise<WhiteboardRow[]> {
  const { data, error } = await supabase.rpc('get_whiteboard', { p_plan: planId })
  if (error) throw error
  return (data ?? []).map((r) => ({
    scoreId: r.score_id,
    athleteId: r.athlete_id,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    scoreType: r.score_type as ScoreType,
    seconds: r.seconds ?? undefined,
    rounds: r.rounds ?? undefined,
    reps: r.reps ?? undefined,
    loadKg: r.load_kg === null ? undefined : Number(r.load_kg),
    capped: r.capped,
    rx: r.rx as Rx,
    note: r.note,
    performedAt: r.performed_at,
    reactions: Number(r.reactions),
    myReaction: (r.my_reaction as Reaction | null) ?? null
  }))
}

/** Pose, change ou retire (emoji null) ma réaction sur un score. */
export async function react(scoreId: string, emoji: Reaction | null): Promise<void> {
  if (emoji === null) {
    const { error } = await supabase.from('score_reactions').delete().eq('score_id', scoreId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('score_reactions').upsert({ score_id: scoreId, emoji }, { onConflict: 'score_id,user_id' })
  if (error) throw error
}
