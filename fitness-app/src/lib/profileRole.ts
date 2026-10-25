import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Rôle choisi à l'inscription (047) : il décide de l'espace où l'on arrive.
 * `null` = pas encore répondu → l'écran « Bienvenue » pose la question.
 */
export type ProfileRole = 'coach' | 'athlete'

export interface OnboardingAnswers {
  /** Coach : où il coache. */
  venue?: 'box' | 'gym' | 'independent' | 'online'
  /** Coach : taille du groupe. */
  groupSize?: '1-10' | '11-30' | '31-100' | '100+'
  /** Athlète : objectif principal. */
  goal?: 'strength' | 'endurance' | 'weight' | 'competition' | 'health'
  /** Athlète : arrivé avec un lien d'invitation de son coach. */
  hasCoach?: boolean
}

// Chaque route protégée monte sa propre garde : sans cache, on relirait le
// profil à chaque changement d'écran. Le cache suit l'utilisateur connecté.
let cache: { userId: string; role: ProfileRole | null } | null = null

export async function fetchMyRole(): Promise<{ userId: string; role: ProfileRole | null } | null> {
  const { data } = await getLocalUser()
  const user = data.user
  if (!user) return null
  if (cache?.userId === user.id) return cache
  const { data: row, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (error) throw error
  cache = { userId: user.id, role: (row?.role as ProfileRole | null) ?? null }
  return cache
}

export async function saveMyRole(role: ProfileRole, answers: OnboardingAnswers): Promise<void> {
  const { data } = await getLocalUser()
  const user = data.user
  if (!user) throw new Error('not_authenticated')
  const { error } = await supabase
    .from('profiles')
    .update({ role, onboarding: answers as never, onboarded_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw error
  cache = { userId: user.id, role }
}

/** Change de rôle depuis les réglages, sans toucher aux réponses d'accueil. */
export async function setMyRole(role: ProfileRole): Promise<void> {
  const { data } = await getLocalUser()
  const user = data.user
  if (!user) throw new Error('not_authenticated')
  const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id)
  if (error) throw error
  cache = { userId: user.id, role }
}

/** Espace d'arrivée selon le rôle. */
export const homeFor = (role: ProfileRole | null): string =>
  role === 'athlete' ? '/athlete' : role === 'coach' ? '/dashboard/today' : '/bienvenue'

/** À la déconnexion : le rôle d'un compte ne doit pas suivre le suivant. */
export function clearRoleCache(): void {
  cache = null
}

/** Accepte un lien complet (https://…/join/abc) ou le code seul. */
export function inviteTokenFrom(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  const m = t.match(/\/join\/([A-Za-z0-9_-]+)/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{6,}$/.test(t) ? t : null
}
