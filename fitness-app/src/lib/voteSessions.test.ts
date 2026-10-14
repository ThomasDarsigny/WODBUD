import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isVoteExpired, isVoteSessionOpen, voteSessionKind } from './voteSessions'

// L'échéance est une date stockée à minuit UTC ; le vote reste ouvert toute
// cette journée-là (24 h de marge). La RLS (migrations 024/035) applique la
// même règle : si ce test change, la base doit changer aussi.
describe('ouverture d’un vote', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reste ouvert sans échéance', () => {
    const s = { status: 'open' as const, deadline: null }
    expect(isVoteExpired(s)).toBe(false)
    expect(voteSessionKind(s)).toBe('open')
    expect(isVoteSessionOpen(s)).toBe(true)
  })

  it('reste ouvert toute la journée de l’échéance', () => {
    expect(voteSessionKind({ status: 'open', deadline: '2026-10-13' })).toBe('open')
  })

  it('expire le lendemain de l’échéance, pile à la frontière', () => {
    vi.setSystemTime(new Date('2026-10-14T00:00:00Z'))
    const s = { status: 'open' as const, deadline: '2026-10-13' }
    expect(isVoteExpired(s)).toBe(true)
    expect(voteSessionKind(s)).toBe('expired')
    expect(isVoteSessionOpen(s)).toBe(false)
  })

  it('distingue « fermé par le coach » d’« expiré »', () => {
    expect(voteSessionKind({ status: 'closed', deadline: null })).toBe('closed')
    expect(voteSessionKind({ status: 'closed', deadline: '2026-01-01' })).toBe('closed')
    expect(isVoteSessionOpen({ status: 'closed', deadline: null })).toBe(false)
  })
})
