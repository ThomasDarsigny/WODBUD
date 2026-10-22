import { describe, expect, it } from 'vitest'
import { estimate1RM, formatSeconds, fromKg, isNewRecord, parseDuration, summarize, toKg, type ExerciseResult } from './records'

const r = (p: Partial<ExerciseResult>): ExerciseResult => ({
  id: Math.random().toString(36).slice(2),
  exerciseId: 'squat',
  sessionId: null,
  weightKg: null,
  reps: null,
  seconds: null,
  performedAt: '2026-10-01T10:00:00Z',
  notes: null,
  ...p
})

describe('records personnels', () => {
  it('1RM estimé (Epley), borné à 12 répétitions', () => {
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(100, null)).toBe(100)
    expect(estimate1RM(100, 5)).toBe(116.7)
    expect(estimate1RM(100, 20)).toBeNull()
  })

  it('résume par mouvement : charge, répétitions, temps', () => {
    const [s] = summarize([
      r({ weightKg: 100, reps: 5, performedAt: '2026-10-01T10:00:00Z' }),
      r({ weightKg: 110, reps: 1, performedAt: '2026-10-08T10:00:00Z' }),
      r({ seconds: 200 }),
      r({ seconds: 180 }),
      r({ reps: 12 })
    ])
    expect(s.bestWeight?.weightKg).toBe(110)
    expect(s.best1RM).toBe(116.7)
    expect(s.bestTime?.seconds).toBe(180)
    expect(s.bestReps?.reps).toBe(12)
    expect(s.count).toBe(5)
    expect(s.lastAt).toBe('2026-10-08T10:00:00Z')
  })

  it('un nouveau record se compare dans la même famille', () => {
    const before = [r({ weightKg: 100 }), r({ seconds: 200 })]
    expect(isNewRecord(before, r({ weightKg: 102.5 }))).toBe(true)
    expect(isNewRecord(before, r({ weightKg: 100 }))).toBe(false)
    expect(isNewRecord(before, r({ seconds: 190 }))).toBe(true)
    expect(isNewRecord(before, r({ reps: 30 }))).toBe(false)
    // Le tout premier résultat n'est pas « un record battu ».
    expect(isNewRecord([], r({ weightKg: 60 }))).toBe(false)
  })

  it('convertit kg et lb', () => {
    expect(fromKg(100, 'lb')).toBe(220)
    expect(toKg(225, 'lb')).toBe(102.06)
    expect(fromKg(102.06, 'kg')).toBe(102.1)
  })

  it('lit et écrit les durées', () => {
    expect(parseDuration('3:20')).toBe(200)
    expect(parseDuration('1:02:05')).toBe(3725)
    expect(parseDuration('45')).toBe(45)
    expect(parseDuration('3m')).toBeNull()
    expect(parseDuration('0')).toBeNull()
    expect(formatSeconds(200)).toBe('3:20')
    expect(formatSeconds(3725)).toBe('1:02:05')
  })
})
