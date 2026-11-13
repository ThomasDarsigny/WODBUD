import { slotsOn, type ClassSlot } from './classSlots'
import { shiftDate } from './planWeek'

/**
 * Accueil du coach (phase 3, 3.5) : la salle aujourd'hui et ce qu'il reste à
 * faire, calculés sans réseau pour être testés.
 */
export interface HomeClass { id: string; name: string }
export interface HomePlan { id: string; class_id: string; scheduled_date: string; title: string | null }

export interface GymTodayEntry {
  classId: string
  name: string
  /** Heures de début du jour (« 06:00:00 »), triées ; vide si le cours n'a pas d'horaire ce jour-là. */
  times: string[]
  plan: HomePlan | null
  present: number
}

function minutesOf(start: string): number {
  const [h, m] = start.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Les cours du jour : ceux qui ont un créneau aujourd'hui, et ceux qui ont
 * une séance programmée aujourd'hui sans créneau. Par heure, puis par nom.
 */
export function gymToday(
  classes: HomeClass[],
  slotsByClass: Record<string, Pick<ClassSlot, 'weekday' | 'start_time'>[]>,
  plans: HomePlan[],
  presentByClass: Record<string, number>,
  today: string
): GymTodayEntry[] {
  const entries: GymTodayEntry[] = []
  for (const c of classes) {
    const times = slotsOn(slotsByClass[c.id] ?? [], today).map((s) => s.start_time)
    const plan = plans.find((p) => p.class_id === c.id && p.scheduled_date === today) ?? null
    if (times.length === 0 && !plan) continue
    entries.push({ classId: c.id, name: c.name, times, plan, present: presentByClass[c.id] ?? 0 })
  }
  return entries.sort((a, b) => {
    if (a.times.length === 0 || b.times.length === 0) return (a.times.length === 0 ? 1 : 0) - (b.times.length === 0 ? 1 : 0) || a.name.localeCompare(b.name)
    return minutesOf(a.times[0]) - minutesOf(b.times[0]) || a.name.localeCompare(b.name)
  })
}

/** Jours de cours des 7 prochains jours (aujourd'hui compris) sans séance programmée. */
export function unplannedDays(slots: Pick<ClassSlot, 'weekday' | 'start_time'>[], plans: Pick<HomePlan, 'scheduled_date'>[], today: string, days = 7): string[] {
  const out: string[] = []
  for (let i = 0; i < days; i++) {
    const d = shiftDate(today, i)
    if (slotsOn(slots, d).length > 0 && !plans.some((p) => p.scheduled_date === d)) out.push(d)
  }
  return out
}
