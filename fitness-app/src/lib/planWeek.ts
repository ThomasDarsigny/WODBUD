/**
 * Calcul de la semaine du calendrier d'un cours (phase 2, 2.2). Les dates
 * restent des chaînes `YYYY-MM-DD` locales, comme `class_plans.scheduled_date` :
 * on calcule à midi pour ne jamais glisser d'un jour au changement d'heure.
 */

const toDate = (iso: string) => new Date(`${iso}T12:00:00`)
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function shiftDate(iso: string, days: number): string {
  const d = toDate(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

/** Lundi de la semaine qui contient `iso`. */
export function weekStart(iso: string): string {
  const d = toDate(iso)
  const offset = (d.getDay() + 6) % 7 // lundi = 0
  return shiftDate(iso, -offset)
}

/** Les 7 jours, du lundi au dimanche. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i))
}

export interface PlanLike {
  scheduled_date: string
  workout_id: string | null
  title: string | null
  notes: string | null
}

/**
 * Ce que « Dupliquer vers la semaine suivante » doit créer : chaque séance
 * de la semaine, sept jours plus tard, sauf si la même séance (même WOD ou
 * même titre) y est déjà.
 */
export function duplicationFor(weekPlans: PlanLike[], nextWeekPlans: PlanLike[]): PlanLike[] {
  const key = (p: PlanLike, date: string) => `${date}|${p.workout_id ?? ''}|${(p.title ?? '').trim().toLowerCase()}`
  const existing = new Set(nextWeekPlans.map((p) => key(p, p.scheduled_date)))
  const out: PlanLike[] = []
  for (const p of weekPlans) {
    const date = shiftDate(p.scheduled_date, 7)
    const k = key(p, date)
    if (existing.has(k)) continue
    existing.add(k)
    out.push({ scheduled_date: date, workout_id: p.workout_id, title: p.title, notes: p.notes })
  }
  return out
}
