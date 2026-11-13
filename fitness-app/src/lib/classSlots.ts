import { localDate } from './scheduledWorkouts'
import { shiftDate } from './planWeek'

/**
 * Horaire récurrent d'un cours (phase 3, 3.1). Un créneau : un jour de la
 * semaine (1 = lundi … 7 = dimanche), une heure locale de la salle et une
 * durée. Tout est calculé ici sans réseau, pour être testé.
 */
export interface ClassSlot {
  id: string
  class_id: string
  weekday: number
  /** « 06:00:00 » tel que renvoyé par Postgres (ou « 06:00 »). */
  start_time: string
  duration_minutes: number
}

export const MAX_SLOTS = 28
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
export const DURATIONS = [30, 45, 60, 75, 90, 120] as const

/** Jour ISO d'une date : 1 = lundi … 7 = dimanche. */
export function isoWeekday(iso: string): number {
  const day = new Date(`${iso}T12:00:00`).getDay()
  return day === 0 ? 7 : day
}

function minutesOf(start: string): number {
  const [h, m] = start.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Par jour, puis par heure. */
export function sortSlots<T extends Pick<ClassSlot, 'weekday' | 'start_time'>>(slots: T[]): T[] {
  return [...slots].sort((a, b) => a.weekday - b.weekday || minutesOf(a.start_time) - minutesOf(b.start_time))
}

/** « 6 h », « 17 h 30 » en français ; l'usage local ailleurs (« 6:00 AM »). */
export function formatSlotTime(start: string, lang: string): string {
  const total = minutesOf(start)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (lang.startsWith('fr')) return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
  return new Date(2024, 0, 1, h, m).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' })
}

/** Nom court d'un jour ISO (« lun. », « Mon »). Le 1er janvier 2024 est un lundi. */
export function weekdayName(weekday: number, lang: string, style: 'short' | 'long' = 'short'): string {
  return new Date(2024, 0, weekday, 12).toLocaleDateString(lang, { weekday: style })
}

/** Les créneaux d'une date donnée. */
export function slotsOn<T extends Pick<ClassSlot, 'weekday' | 'start_time'>>(slots: T[], iso: string): T[] {
  const wd = isoWeekday(iso)
  return sortSlots(slots.filter((s) => s.weekday === wd))
}

/**
 * Résumé lisible : les jours qui partagent la même heure sont regroupés.
 * « lun., mer., ven. · 6 h ; sam. · 9 h ».
 */
export function summarizeSlots(slots: Pick<ClassSlot, 'weekday' | 'start_time'>[], lang: string): string {
  const byTime = new Map<number, number[]>()
  for (const s of sortSlots(slots)) {
    const key = minutesOf(s.start_time)
    const days = byTime.get(key) ?? []
    if (!days.includes(s.weekday)) days.push(s.weekday)
    byTime.set(key, days)
  }
  return [...byTime.entries()]
    .sort((a, b) => a[1][0] - b[1][0] || a[0] - b[0])
    .map(([minutes, days]) => {
      const time = formatSlotTime(`${Math.floor(minutes / 60)}:${minutes % 60}`, lang)
      return `${days.map((d) => weekdayName(d, lang)).join(', ')} · ${time}`
    })
    .join(' ; ')
}

export interface Occurrence<T> {
  slot: T
  date: string
  /** Vrai si le cours a commencé et n'est pas fini. */
  ongoing: boolean
}

/**
 * Le prochain cours à partir de maintenant. Un cours commencé mais pas fini
 * compte encore (« en cours »). Null s'il n'y a aucun créneau.
 */
export function nextOccurrence<T extends Pick<ClassSlot, 'weekday' | 'start_time' | 'duration_minutes'>>(slots: T[], now: Date = new Date()): Occurrence<T> | null {
  if (slots.length === 0) return null
  const today = localDate(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (let offset = 0; offset <= 7; offset++) {
    const date = shiftDate(today, offset)
    for (const slot of slotsOn(slots, date)) {
      const start = minutesOf(slot.start_time)
      if (offset > 0 || nowMin < start + slot.duration_minutes) {
        return { slot, date, ongoing: offset === 0 && nowMin >= start }
      }
    }
  }
  return null
}

/** La prochaine date (aujourd'hui compris) qui tombe sur un créneau. */
export function nextSlotDate(slots: Pick<ClassSlot, 'weekday' | 'start_time'>[], from: string): string | null {
  for (let offset = 0; offset < 7; offset++) {
    const date = shiftDate(from, offset)
    if (slots.some((s) => s.weekday === isoWeekday(date))) return date
  }
  return null
}
