import { describe, expect, it } from 'vitest'
import { duplicationFor, shiftDate, weekDays, weekStart } from './planWeek'

describe('semaine du calendrier', () => {
  it('trouve le lundi, y compris depuis un dimanche', () => {
    expect(weekStart('2026-11-12')).toBe('2026-11-09') // jeudi
    expect(weekStart('2026-11-15')).toBe('2026-11-09') // dimanche
    expect(weekStart('2026-11-09')).toBe('2026-11-09') // lundi
  })

  it('donne 7 jours et traverse les fins de mois et le changement d’heure', () => {
    expect(weekDays('2026-11-30')).toEqual(['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06'])
    expect(shiftDate('2026-03-07', 1)).toBe('2026-03-08')
    expect(shiftDate('2026-03-08', 1)).toBe('2026-03-09')
    expect(shiftDate('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('duplique la semaine sans recréer ce qui existe déjà', () => {
    const week = [
      { scheduled_date: '2026-11-09', workout_id: 'fran', title: null, notes: '21-15-9' },
      { scheduled_date: '2026-11-11', workout_id: null, title: 'Mobilité', notes: null }
    ]
    const next = [{ scheduled_date: '2026-11-16', workout_id: 'fran', title: null, notes: null }]
    expect(duplicationFor(week, next)).toEqual([
      { scheduled_date: '2026-11-18', workout_id: null, title: 'Mobilité', notes: null }
    ])
    expect(duplicationFor([], next)).toEqual([])
  })
})
