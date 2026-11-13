import { describe, expect, it } from 'vitest'
import { formatSlotTime, isoWeekday, nextOccurrence, nextSlotDate, slotsOn, sortSlots, summarizeSlots } from './classSlots'

const slot = (weekday: number, start_time: string, duration_minutes = 60) => ({ id: `${weekday}-${start_time}`, class_id: 'c', weekday, start_time, duration_minutes })
// Lundi, mercredi et vendredi à 6 h ; samedi à 9 h 30.
const slots = [slot(5, '06:00:00'), slot(1, '06:00:00'), slot(6, '09:30:00', 90), slot(3, '06:00:00')]

describe('horaire récurrent', () => {
  it('lit le jour ISO (lundi 1, dimanche 7)', () => {
    expect(isoWeekday('2026-11-16')).toBe(1)
    expect(isoWeekday('2026-11-22')).toBe(7)
  })

  it('trie par jour puis par heure, et filtre une date', () => {
    expect(sortSlots([slot(1, '17:30'), slot(1, '06:00'), slot(0 + 3, '05:00')]).map((s) => `${s.weekday} ${s.start_time}`)).toEqual(['1 06:00', '1 17:30', '3 05:00'])
    expect(slotsOn(slots, '2026-11-18').map((s) => s.start_time)).toEqual(['06:00:00'])
    expect(slotsOn(slots, '2026-11-17')).toEqual([])
  })

  it('écrit l’heure à la québécoise en français', () => {
    expect(formatSlotTime('06:00:00', 'fr')).toBe('6 h')
    expect(formatSlotTime('17:30:00', 'fr')).toBe('17 h 30')
    expect(formatSlotTime('17:30:00', 'en')).toMatch(/5:30\s?PM/)
  })

  it('regroupe les jours qui partagent la même heure', () => {
    expect(summarizeSlots(slots, 'fr')).toBe('lun., mer., ven. · 6 h ; sam. · 9 h 30')
    expect(summarizeSlots([], 'fr')).toBe('')
  })

  it('trouve le prochain cours, y compris celui qui a commencé', () => {
    // Mercredi 18 novembre 2026, 5 h 30 : le cours de 6 h du jour.
    expect(nextOccurrence(slots, new Date(2026, 10, 18, 5, 30))).toMatchObject({ date: '2026-11-18', ongoing: false, slot: { weekday: 3 } })
    // 6 h 20 : il est en cours.
    expect(nextOccurrence(slots, new Date(2026, 10, 18, 6, 20))).toMatchObject({ date: '2026-11-18', ongoing: true })
    // 7 h 05 : fini, le prochain est vendredi.
    expect(nextOccurrence(slots, new Date(2026, 10, 18, 7, 5))).toMatchObject({ date: '2026-11-20', ongoing: false })
    // Dimanche soir : lundi.
    expect(nextOccurrence(slots, new Date(2026, 10, 22, 20, 0))).toMatchObject({ date: '2026-11-23' })
    // Un seul cours le lundi à 6 h, vu le lundi à 8 h : le lundi suivant.
    expect(nextOccurrence([slot(1, '06:00')], new Date(2026, 10, 16, 8, 0))).toMatchObject({ date: '2026-11-23' })
    expect(nextOccurrence([], new Date())).toBeNull()
  })

  it('donne la prochaine date de créneau à partir d’un jour', () => {
    expect(nextSlotDate(slots, '2026-11-17')).toBe('2026-11-18')
    expect(nextSlotDate(slots, '2026-11-16')).toBe('2026-11-16')
    expect(nextSlotDate([], '2026-11-16')).toBeNull()
  })
})
