import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Profil choisi à l'inscription (048) : centre, membre d'un centre ou perso.
 * Il ne décide que de l'espace d'arrivée ; les droits dans un centre viennent
 * de center_members. `null` = pas encore répondu → l'écran « Bienvenue ».
 */
export type ProfileRole = 'center' | 'member' | 'perso'

export interface OnboardingAnswers {
  /** Centre : type de lieu. */
  venue?: 'box' | 'gym' | 'independent' | 'online'
  /** Centre : taille du groupe. */
  groupSize?: '1-10' | '11-30' | '31-100' | '100+'
  /** Membre ou perso : objectif principal. */
  goal?: 'strength' | 'endurance' | 'weight' | 'competition' | 'health'
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

export async function saveMyRole(role: ProfileRole, answers: OnboardingAnswers, equipment?: string[]): Promise<void> {
  const { data } = await getLocalUser()
  const user = data.user
  if (!user) throw new Error('not_authenticated')
  const { error } = await supabase
    .from('profiles')
    .update({
      role,
      onboarding: answers as never,
      onboarded_at: new Date().toISOString(),
      ...(equipment ? { equipment } : {})
    })
    .eq('id', user.id)
  if (error) throw error
  cache = { userId: user.id, role }
}

/** Après une invitation acceptée ou un centre créé, la base a fixé le profil. */
export function rememberRole(userId: string, role: ProfileRole): void {
  cache = { userId, role }
}

export async function fetchMyEquipment(): Promise<string[]> {
  const { data } = await getLocalUser()
  const user = data.user
  if (!user) return []
  const { data: row, error } = await supabase.from('profiles').select('equipment').eq('id', user.id).maybeSingle()
  if (error) throw error
  return row?.equipment ?? []
}

export async function saveMyEquipment(equipment: string[]): Promise<void> {
  const { data } = await getLocalUser()
  const user = data.user
  if (!user) throw new Error('not_authenticated')
  const { error } = await supabase.from('profiles').update({ equipment }).eq('id', user.id)
  if (error) throw error
}

/** Espace d'arrivée selon le rôle. */
export const homeFor = (role: ProfileRole | null): string =>
  role === 'center' ? '/dashboard/today' : role ? '/athlete' : '/bienvenue'

/** À la déconnexion : le rôle d'un compte ne doit pas suivre le suivant. */
export function clearRoleCache(): void {
  cache = null
}

/** Lien d'invitation à un cours (…/join/abc) : le code seul est celui d'un centre. */
export function inviteTokenFrom(text: string): string | null {
  const m = text.trim().match(/\/join\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}
