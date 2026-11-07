import { supabase } from './supabase'
import { getLocalUser } from './currentUser'
import { cleanEquipment, type EquipmentId } from './equipment'

/**
 * Centres (048) : le côté business. Les droits viennent du rôle dans
 * center_members, jamais de profiles.role.
 */
export type CenterRole = 'owner' | 'head_coach' | 'coach' | 'member'
export type StaffInviteRole = 'head_coach' | 'coach'

export interface Center {
  id: string
  name: string
  owner_id: string
  equipment: EquipmentId[]
  venue: string | null
  group_size: string | null
}

export interface MyCenter {
  center: Center
  role: CenterRole
}

export interface TeamMember {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  role: CenterRole
  joined_at: string
}

const RANK: Record<CenterRole, number> = { member: 0, coach: 1, head_coach: 2, owner: 3 }

export const isStaff = (role: CenterRole | null | undefined) => role === 'owner' || role === 'head_coach' || role === 'coach'
export const isLead = (role: CenterRole | null | undefined) => role === 'owner' || role === 'head_coach'

/** Le centre où l'on a le rôle le plus élevé (le plus ancien à égalité). */
export async function fetchMyCenter(): Promise<MyCenter | null> {
  const { data } = await getLocalUser()
  const user = data.user
  if (!user) return null
  const { data: rows, error } = await supabase
    .from('center_members')
    .select('role, joined_at, centers(id, name, owner_id, equipment, venue, group_size)')
    .eq('user_id', user.id)
    .order('joined_at')
  if (error) throw error
  let best: MyCenter | null = null
  for (const row of rows ?? []) {
    const c = row.centers
    if (!c) continue
    const role = row.role as CenterRole
    if (!best || RANK[role] > RANK[best.role]) {
      best = { role, center: { ...c, equipment: cleanEquipment(c.equipment) } }
    }
  }
  return best
}

export async function createCenter(input: { name: string; equipment: EquipmentId[]; venue?: string; groupSize?: string }): Promise<string> {
  const { data, error } = await supabase.rpc('create_center', {
    p_name: input.name.trim(),
    p_equipment: input.equipment,
    p_venue: input.venue,
    p_group_size: input.groupSize
  })
  if (error) throw error
  return data
}

export async function updateCenter(id: string, patch: { name?: string; equipment?: EquipmentId[] }): Promise<void> {
  const { error } = await supabase.from('centers').update(patch).eq('id', id)
  if (error) throw error
}

export async function fetchTeam(centerId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc('get_center_team', { p_center: centerId })
  if (error) throw error
  return (data ?? []).map((m) => ({ ...m, role: m.role as CenterRole }))
}

export async function setMemberRole(centerId: string, userId: string, role: Exclude<CenterRole, 'owner'>): Promise<void> {
  const { error } = await supabase.from('center_members').update({ role }).eq('center_id', centerId).eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(centerId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('center_members').delete().eq('center_id', centerId).eq('user_id', userId)
  if (error) throw error
}

// ─── Invitations ───────────────────────────────────────────────────

export const inviteUrl = (token: string) => `${window.location.origin}/rejoindre/${token}`

/** Le lien permanent des membres (créé avec le centre ; recréé s'il a été révoqué). */
export async function memberInviteToken(centerId: string): Promise<string> {
  const { data, error } = await supabase
    .from('center_invites')
    .select('token')
    .eq('center_id', centerId)
    .eq('role', 'member')
    .is('revoked_at', null)
    .is('expires_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  if (data?.[0]) return data[0].token
  return createInvite(centerId, 'member')
}

/** Lien d'équipe : sert une fois, expire après 7 jours. */
export async function createInvite(centerId: string, role: StaffInviteRole | 'member'): Promise<string> {
  const { data: u } = await getLocalUser()
  if (!u.user) throw new Error('not_authenticated')
  const staff = role !== 'member'
  const { data, error } = await supabase
    .from('center_invites')
    .insert({
      center_id: centerId,
      role,
      created_by: u.user.id,
      expires_at: staff ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() : null,
      max_uses: staff ? 1 : null
    })
    .select('token')
    .single()
  if (error) throw error
  return data.token
}

export async function previewInvite(token: string): Promise<{ centerName: string; role: CenterRole; valid: boolean } | null> {
  const { data, error } = await supabase.rpc('get_center_invite', { p_token: token })
  if (error) throw error
  const row = data?.[0]
  return row ? { centerName: row.center_name, role: row.role as CenterRole, valid: row.valid } : null
}

export async function acceptInvite(token: string): Promise<{ centerId: string; role: CenterRole }> {
  const { data, error } = await supabase.rpc('accept_center_invite', { p_token: token })
  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('invalid_invite')
  return { centerId: row.center_id, role: row.role as CenterRole }
}

/**
 * Un lien ouvert sans être connecté est gardé le temps de créer son compte
 * (et de valider son courriel) : Bienvenue le reprend ensuite.
 */
const PENDING_KEY = 'wodbud_center_invite'

export function savePendingInvite(token: string): void {
  try { localStorage.setItem(PENDING_KEY, token) } catch { /* stockage bloqué */ }
}

export function readPendingInvite(): string | null {
  try { return localStorage.getItem(PENDING_KEY) } catch { return null }
}

export function clearPendingInvite(): void {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* stockage bloqué */ }
}

/** Accepte un lien complet (…/rejoindre/abc) ou le code seul. */
export function centerTokenFrom(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  const m = t.match(/\/rejoindre\/([A-Za-z0-9_-]+)/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{6,}$/.test(t) ? t : null
}
