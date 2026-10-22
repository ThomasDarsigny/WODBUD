import { describe, expect, it } from 'vitest'
import { countdownSecond, hasFormatClock, workoutClock } from './workoutClock'

const S = 1000
const M = 60 * S

describe('horloge du format de WOD', () => {
  it('sans format, compte simplement vers le haut', () => {
    const c = workoutClock(null, 42 * S)
    expect(c).toMatchObject({ direction: 'up', phase: 'work', displayMs: 42 * S, round: null })
  })

  it('AMRAP : compte à rebours, puis terminé', () => {
    const f = { method: 'amrap' as const, durationMinutes: 12 }
    expect(workoutClock(f, 2 * M)).toMatchObject({ direction: 'down', displayMs: 10 * M, phase: 'work' })
    expect(workoutClock(f, 12 * M).phase).toBe('done')
    expect(workoutClock(f, 20 * M).displayMs).toBe(0)
  })

  it('For Time : affiche le temps réalisé, s\'arrête au cap', () => {
    const f = { method: 'for_time' as const, durationMinutes: 15 }
    expect(workoutClock(f, 5 * M)).toMatchObject({ direction: 'up', displayMs: 5 * M, segmentRemainingMs: 10 * M })
    expect(workoutClock(f, 16 * M)).toMatchObject({ phase: 'done', displayMs: 15 * M })
  })

  it('EMOM : une minute par tour, nouveau segment chaque minute', () => {
    const f = { method: 'emom' as const, durationMinutes: 10 }
    const a = workoutClock(f, 2 * M + 15 * S)
    expect(a).toMatchObject({ round: 3, totalRounds: 10, displayMs: 45 * S, segmentKey: 'work-2' })
    expect(workoutClock(f, 3 * M).segmentKey).toBe('work-3')
    expect(workoutClock(f, 10 * M).phase).toBe('done')
  })

  it('EMOM sans durée : tours sans fin', () => {
    expect(workoutClock({ method: 'emom', durationMinutes: null }, 61 * M)).toMatchObject({ round: 62, totalRounds: null, phase: 'work' })
  })

  it('Tabata : 20 s d\'effort, 10 s de repos, 8 tours par défaut', () => {
    const f = { method: 'tabata' as const, durationMinutes: null }
    expect(workoutClock(f, 5 * S)).toMatchObject({ phase: 'work', round: 1, totalRounds: 8, displayMs: 15 * S })
    expect(workoutClock(f, 25 * S)).toMatchObject({ phase: 'rest', round: 1, displayMs: 5 * S, segmentKey: 'rest-0' })
    expect(workoutClock(f, 30 * S)).toMatchObject({ phase: 'work', round: 2, segmentKey: 'work-1' })
    expect(workoutClock(f, 4 * M).phase).toBe('done')
  })

  it('Tabata avec durée : deux tours par minute', () => {
    expect(workoutClock({ method: 'tabata', durationMinutes: 8 }, 0).totalRounds).toBe(16)
  })

  it('compte à rebours arrondi vers le haut', () => {
    expect(countdownSecond(2_001)).toBe(3)
    expect(countdownSecond(3_000)).toBe(3)
    expect(countdownSecond(null)).toBeNull()
  })

  it('n\'annonce une horloge de format que quand elle apporte quelque chose', () => {
    expect(hasFormatClock({ method: 'strength', durationMinutes: 20 })).toBe(false)
    expect(hasFormatClock({ method: 'amrap', durationMinutes: null })).toBe(false)
    expect(hasFormatClock({ method: 'amrap', durationMinutes: 12 })).toBe(true)
    expect(hasFormatClock({ method: 'tabata', durationMinutes: null })).toBe(true)
  })
})
