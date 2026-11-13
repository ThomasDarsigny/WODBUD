import { describe, expect, it } from 'vitest'
import { conflictsFor, primaryMuscles, weekWarnings } from './weekVolume'

describe('volume de la semaine', () => {
  it('garde les muscles principaux, sans doublon ni cardio', () => {
    expect(primaryMuscles([{ primary_muscle: 'quads' }, { primary_muscle: 'quads' }, { primary_muscle: 'cardio_lower' }, { primary_muscle: 'back' }]))
      .toEqual(['quads', 'back'])
  })

  it('signale deux jours de suite et trois jours dans la semaine', () => {
    const w = weekWarnings([
      { date: '2026-11-09', primary: ['quads', 'back'] },
      { date: '2026-11-10', primary: ['quads'] },
      { date: '2026-11-12', primary: ['quads', 'chest'] },
      { date: '2026-11-14', primary: ['back'] }
    ])
    expect(w).toEqual([
      { muscle: 'quads', kind: 'frequent', dates: ['2026-11-09', '2026-11-10', '2026-11-12'] },
      { muscle: 'quads', kind: 'back_to_back', dates: ['2026-11-09', '2026-11-10'] }
    ])
  })

  it('ne dit rien pour une semaine équilibrée', () => {
    expect(weekWarnings([
      { date: '2026-11-09', primary: ['quads'] },
      { date: '2026-11-11', primary: ['back'] },
      { date: '2026-11-13', primary: ['quads'] }
    ])).toEqual([])
  })

  it('prévient d’un conflit la veille ou le lendemain', () => {
    const days = [{ date: '2026-11-10', primary: ['quads' as const] }, { date: '2026-11-12', primary: ['back' as const] }]
    expect(conflictsFor('2026-11-11', ['quads', 'chest'], days)).toEqual([{ muscle: 'quads', date: '2026-11-10' }])
    expect(conflictsFor('2026-11-14', ['quads'], days)).toEqual([])
  })
})
