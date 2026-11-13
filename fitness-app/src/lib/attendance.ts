import { supabase } from './supabase'
import { slotsOn, type ClassSlot } from './classSlots'
import { shiftDate } from './planWeek'

/**
 * Présences (phase 3, 3.2). Un membre s'enregistre en scannant le QR du
 * coach (méthode « qr ») ou avec « Je suis là » autour de l'heure du cours
 * (« self ») ; le coach peut aussi cocher (« coach »). Une présence par
 * membre, par cours et par jour (migration 069).
 */
export type AttendanceMethod = 'qr' | 'self' | 'coach'
export type CheckInResult = 'ok' | 'already' | 'not_member' | 'bad_date' | 'bad_code' | 'no_class'

export interface Attendance {
  id: string
  class_id: string
  user_id: string
  session_date: string
  method: AttendanceMethod
  checked_in_at: string
}

/** Avant le début et après la fin d'un cours, « Je suis là » reste possible ce temps-là. */
export const SELF_WINDOW_MINUTES = 30

const PENDING_KEY = 'wodbud_pending_checkin'
const PENDING_TTL = 60 * 60 * 1000

/** Un QR scanné sans être connecté : on y revient après la connexion (une heure au plus). */
export function savePendingCheckIn(path: string): void {
  if (!path.startsWith('/presence/')) return
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ path, at: Date.now() })) } catch { /* stockage bloqué */ }
}

export function readPendingCheckIn(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const { path, at } = JSON.parse(raw) as { path?: unknown; at?: unknown }
    if (typeof path !== 'string' || !path.startsWith('/presence/') || typeof at !== 'number' || Date.now() - at > PENDING_TTL) return null
    return path
  } catch {
    return null
  }
}

export function clearPendingCheckIn(): void {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* stockage bloqué */ }
}

export function checkInPath(classId: string, code: string): string {
  return `/presence/${classId}?k=${encodeURIComponent(code)}`
}

function minutesOf(start: string): number {
  const [h, m] = start.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Le créneau du jour pendant lequel « Je suis là » est proposé : de 30 min
 * avant le début à 30 min après la fin. Null en dehors.
 */
export function selfCheckInSlot<T extends Pick<ClassSlot, 'weekday' | 'start_time' | 'duration_minutes'>>(slots: T[], today: string, now: Date = new Date()): T | null {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return slotsOn(slots, today).find((s) => {
    const start = minutesOf(s.start_time)
    return nowMin >= start - SELF_WINDOW_MINUTES && nowMin <= start + s.duration_minutes + SELF_WINDOW_MINUTES
  }) ?? null
}

/** Nombre de jours de cours (au moins un créneau) entre deux dates incluses. */
export function expectedSessions(slots: Pick<ClassSlot, 'weekday' | 'start_time'>[], from: string, to: string): number {
  let n = 0
  for (let d = from; d <= to; d = shiftDate(d, 1)) {
    if (slotsOn(slots, d).length > 0) n += 1
  }
  return n
}

export async function checkIn(classId: string, date: string, code: string | null): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('check_in', { p_class: classId, p_date: date, p_code: code ?? undefined })
  if (error) throw error
  return data as CheckInResult
}

export async function openCheckIn(classId: string): Promise<{ code: string; expires_at: string }> {
  const { data, error } = await supabase.rpc('open_checkin', { p_class: classId })
  if (error) throw error
  const row = (data ?? [])[0]
  if (!row) throw new Error('open_checkin')
  return row
}

const COLUMNS = 'id, class_id, user_id, session_date, method, checked_in_at'

export async function fetchAttendanceBetween(classId: string, from: string, to: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('class_attendance')
    .select(COLUMNS)
    .eq('class_id', classId)
    .gte('session_date', from)
    .lte('session_date', to)
  if (error) throw error
  return (data ?? []) as Attendance[]
}

export async function fetchMyAttendance(classId: string, userId: string, date: string): Promise<Attendance | null> {
  const { data, error } = await supabase
    .from('class_attendance')
    .select(COLUMNS)
    .eq('class_id', classId)
    .eq('user_id', userId)
    .eq('session_date', date)
    .maybeSingle()
  if (error) throw error
  return (data as Attendance | null) ?? null
}

/** Le coach coche un membre présent. */
export async function markPresent(classId: string, userId: string, date: string): Promise<Attendance> {
  const { data, error } = await supabase
    .from('class_attendance')
    .insert({ class_id: classId, user_id: userId, session_date: date, method: 'coach' })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data as Attendance
}

export async function removeAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('class_attendance').delete().eq('id', id)
  if (error) throw error
}
