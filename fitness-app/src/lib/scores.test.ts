import { describe, expect, it } from 'vitest'
import { compareScores, formatScore, formatTime, history, loadToKg, parseTime, scoreTypeFor, type Score } from './scores'

const s = (p: Partial<Score> & Pick<Score, 'scoreType'>): Score => ({ sessionId: 's', workoutId: 'w', rx: 'rx', ...p })

describe('scores', () => {
  it('déduit le type de score de la méthode', () => {
    expect(scoreTypeFor('for_time')).toBe('time')
    expect(scoreTypeFor('amrap')).toBe('rounds_reps')
    expect(scoreTypeFor('emom')).toBe('reps')
    expect(scoreTypeFor('strength')).toBe('load')
    expect(scoreTypeFor('custom')).toBeNull()
  })

  it('lit un temps tapé comme sur un tableau blanc', () => {
    expect(parseTime('6:12')).toBe(372)
    expect(parseTime('1:02:05')).toBe(3725)
    expect(parseTime('372')).toBe(372)
    expect(parseTime('6:75')).toBeNull()
    expect(parseTime('abc')).toBeNull()
    expect(parseTime('0')).toBeNull()
  })

  it('affiche les scores', () => {
    expect(formatTime(372)).toBe('6:12')
    expect(formatTime(3725)).toBe('1:02:05')
    expect(formatScore({ scoreType: 'time', seconds: 372 })).toBe('6:12')
    expect(formatScore({ scoreType: 'time', seconds: 1200, capped: true, reps: 87 })).toBe('20:00 (cap, 87 reps)')
    expect(formatScore({ scoreType: 'rounds_reps', rounds: 12, reps: 4 })).toBe('12 rds + 4')
    expect(formatScore({ scoreType: 'rounds_reps', rounds: 12, reps: 0 })).toBe('12 rds')
    expect(formatScore({ scoreType: 'reps', reps: 150 })).toBe('150 reps')
    expect(formatScore({ scoreType: 'load', loadKg: 102.5, reps: 3 })).toBe('102.5 kg × 3')
    expect(formatScore({ scoreType: 'load', loadKg: 100 }, 'lb')).toBe('220 lb')
  })

  it('classe les scores : temps court, puis terminé avant cap, puis plus de reps', () => {
    const a = s({ scoreType: 'time', seconds: 372 }), b = s({ scoreType: 'time', seconds: 400 })
    expect(compareScores(a, b)).toBeLessThan(0)
    const cap = s({ scoreType: 'time', seconds: 1200, capped: true, reps: 90 })
    expect(compareScores(b, cap)).toBeLessThan(0)
    expect(compareScores(cap, s({ scoreType: 'time', seconds: 1200, capped: true, reps: 80 }))).toBeLessThan(0)
    expect(compareScores(s({ scoreType: 'rounds_reps', rounds: 12, reps: 4 }), s({ scoreType: 'rounds_reps', rounds: 12, reps: 2 }))).toBeLessThan(0)
    expect(compareScores(s({ scoreType: 'load', loadKg: 100 }), s({ scoreType: 'load', loadKg: 110 }))).toBeGreaterThan(0)
    expect(compareScores(a, s({ scoreType: 'reps', reps: 1 }))).toBe(0)
  })

  it('convertit la charge saisie en kg', () => {
    expect(loadToKg(100, 'kg')).toBe(100)
    expect(loadToKg(225, 'lb')).toBe(102.06)
  })

  it('retrouve la dernière fois et le meilleur score, RX d’abord, hors séance en cours', () => {
    const list = [
      s({ sessionId: 'now', scoreType: 'time', seconds: 300 }),
      s({ sessionId: 'b', scoreType: 'time', seconds: 400, rx: 'scaled' }),
      s({ sessionId: 'c', scoreType: 'time', seconds: 420 }),
      s({ sessionId: 'd', scoreType: 'time', seconds: 380 })
    ]
    const h = history(list, 'now')
    expect(h.last?.sessionId).toBe('b')
    expect(h.best?.sessionId).toBe('d')
    expect(h.count).toBe(3)
    expect(history([], 'x')).toEqual({ last: null, best: null, count: 0 })
  })
})
