import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * « Premiers pas » : chaque étape se coche d'elle-même à partir des vraies
 * données (un WOD existe, une séance a été faite…), jamais d'une case que
 * l'utilisateur coche à la main.
 */
export type OnboardingArea = 'coach' | 'athlete'
export type StepKey = 'wod' | 'class' | 'session' | 'photo' | 'join' | 'community'

export interface OnboardingState {
  userId: string
  done: Record<StepKey, boolean>
}

const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
  const { count: n, error } = await q
  if (error) throw error
  return (n ?? 0) > 0
}

export async function fetchOnboarding(): Promise<OnboardingState | null> {
  const { data: { user } } = await getLocalUser()
  if (!user) return null
  const head = { count: 'exact' as const, head: true }
  const [wod, klass, session, join, community, profile] = await Promise.all([
    count(supabase.from('workouts').select('id', head).eq('created_by', user.id)),
    count(supabase.from('classes').select('id', head).eq('coach_id', user.id)),
    count(supabase.from('workout_sessions').select('id', head).eq('user_id', user.id)),
    count(supabase.from('class_members').select('class_id', head).eq('athlete_id', user.id)),
    count(supabase.from('community_members').select('community_id', head).eq('user_id', user.id)),
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
  ])
  return {
    userId: user.id,
    done: { wod, class: klass, session, join, community, photo: Boolean(profile.data?.avatar_url) }
  }
}

export const STEPS: Record<OnboardingArea, StepKey[]> = {
  coach: ['wod', 'class', 'session', 'photo'],
  athlete: ['join', 'session', 'community', 'photo']
}

const KEY = (userId: string) => `wodbud_onboarding_hidden_${userId}`

export function isHidden(userId: string): boolean {
  try { return localStorage.getItem(KEY(userId)) === '1' } catch { return false }
}

export function hide(userId: string): void {
  try { localStorage.setItem(KEY(userId), '1') } catch { /* mode privé : masqué pour la session */ }
}
