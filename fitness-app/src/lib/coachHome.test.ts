import { describe, expect, it } from 'vitest'
import { gymToday, unplannedDays } from './coachHome'

const slot = (weekday: number, start_time: string) => ({ weekday, start_time })
// Mercredi 18 novembre 2026.
const today = '2026-11-18'
const classes = [{ id: 'soir', name: 'CrossFit 17h' }, { id: 'matin', name: 'CrossFit 6h' }, { id: 'open', name: 'Open gym' }, { id: 'off', name: 'Haltéro' }]
const slots = {
  matin: [slot(1, '06:00'), slot(3, '06:00'), slot(5, '06:00')],
  soir: [slot(3, '17:30'), slot(3, '12:00')],
  off: [slot(2, '18:00')]
}

describe('accueil du coach', () => {
  it('liste les cours du jour par heure, puis ceux sans horaire mais programmés', () => {
    const plans = [
      { id: 'p1', class_id: 'matin', scheduled_date: today, title: 'Fran' },
      { id: 'p2', class_id: 'open', scheduled_date: today, title: 'Libre' },
      { id: 'p3', class_id: 'soir', scheduled_date: '2026-11-19', title: 'Demain' }
    ]
    const entries = gymToday(classes, slots, plans, { matin: 7 }, today)
    expect(entries.map((e) => e.classId)).toEqual(['matin', 'soir', 'open'])
    expect(entries[0]).toMatchObject({ times: ['06:00'], plan: { id: 'p1' }, present: 7 })
    expect(entries[1]).toMatchObject({ times: ['12:00', '17:30'], plan: null, present: 0 })
    expect(entries[2].times).toEqual([])
  })

  it('repère les jours de cours sans WOD sur sept jours', () => {
    // Mercredi : lundi, mercredi, vendredi. Programmé : mercredi 18. Manquent ven. 20 et lun. 23.
    expect(unplannedDays(slots.matin, [{ scheduled_date: today }], today)).toEqual(['2026-11-20', '2026-11-23'])
    expect(unplannedDays([], [], today)).toEqual([])
  })
})
