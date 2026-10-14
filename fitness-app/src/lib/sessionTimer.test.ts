import { describe, expect, it } from 'vitest'
import {
  EMPTY_TIMER,
  activeMs,
  formatClock,
  pauseTimer,
  resumeTimer,
  startTimer,
  toActiveMinutes,
  wallClockMs
} from './sessionTimer'

describe('chrono de séance', () => {
  it('démarre à zéro, en marche', () => {
    const t = startTimer(1_000)
    expect(t).toEqual({ startedAt: new Date(1_000).toISOString(), accumulatedMs: 0, runningSince: 1_000 })
    expect(activeMs(t, 6_000)).toBe(5_000)
  })

  it('exclut les pauses du temps actif, mais pas du temps au mur', () => {
    const paused = pauseTimer(startTimer(0), 10_000)
    expect(activeMs(paused, 50_000)).toBe(10_000)

    const resumed = resumeTimer(paused, 60_000)
    expect(activeMs(resumed, 65_000)).toBe(15_000)
    expect(wallClockMs(resumed, 65_000)).toBe(65_000)
  })

  it('ne retranche jamais de temps si l’horloge système recule', () => {
    expect(activeMs(startTimer(10_000), 5_000)).toBe(0)
  })

  it('ignore une double pause ou une double reprise', () => {
    const paused = pauseTimer(startTimer(0), 1_000)
    expect(pauseTimer(paused, 9_000)).toBe(paused)
    const running = startTimer(0)
    expect(resumeTimer(running, 9_000)).toBe(running)
  })

  it('vaut 0 au mur tant que la séance n’a pas commencé', () => {
    expect(wallClockMs(EMPTY_TIMER, 123_456)).toBe(0)
  })

  it('arrondit les minutes actives : moins de 30 s ne compte pas', () => {
    expect(toActiveMinutes(29_999)).toBe(0)
    expect(toActiveMinutes(30_000)).toBe(1)
    expect(toActiveMinutes(89_999)).toBe(1)
    expect(toActiveMinutes(90_000)).toBe(2)
  })

  it('formate MM:SS, puis H:MM:SS au-delà d’une heure', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65_000)).toBe('01:05')
    expect(formatClock(3_661_000)).toBe('1:01:01')
    expect(formatClock(-5_000)).toBe('00:00')
  })
})
