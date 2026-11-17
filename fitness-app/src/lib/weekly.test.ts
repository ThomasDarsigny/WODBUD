import { describe, expect, it } from 'vitest'
import { lastWeeks, niceMax, totalsByWeek } from './weekly'

describe('tendances par semaine (constat 08)', () => {
  it('donne les lundis des dernières semaines, la semaine en cours comprise', () => {
    // Mercredi 18 novembre 2026 : la semaine commence le lundi 16.
    expect(lastWeeks(3, '2026-11-18')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16'])
    expect(lastWeeks(1, '2026-11-16')).toEqual(['2026-11-16'])
  })

  it('additionne par semaine, ignore ce qui sort de la période', () => {
    const weeks = lastWeeks(2, '2026-11-18')
    const rows = [
      { date: '2026-11-09', value: 1 },
      { date: '2026-11-15T23:30:00Z', value: 2 },
      { date: '2026-11-16', value: 3 },
      { date: '2026-11-22', value: 4 },
      { date: '2026-10-01', value: 100 }
    ]
    expect(totalsByWeek(rows, weeks)).toEqual([3, 7])
  })

  it('arrondit le haut de l’axe à un nombre rond et pair (milieu entier)', () => {
    expect(niceMax(0)).toBe(2)
    expect(niceMax(3)).toBe(4)
    expect(niceMax(5)).toBe(6)
    expect(niceMax(7)).toBe(10)
    expect(niceMax(12)).toBe(20)
    expect(niceMax(45)).toBe(60)
    expect(niceMax(180)).toBe(200)
    expect(niceMax(200)).toBe(200)
    for (const max of [1, 3, 5, 9, 11, 33, 75, 140, 999]) expect((niceMax(max) / 2) % 1).toBe(0)
  })
})
