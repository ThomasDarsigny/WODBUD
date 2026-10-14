import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

const { rankRows, startOfMonthLocal, startOfWeekLocal } = await import('./leaderboard')

function row(userId: string, minutes: number, longestStreak = 0) {
  return { userId, displayName: userId, minutes, currentStreak: 0, longestStreak, position: 0 }
}

describe('classement d’un cours', () => {
  it('trie par minutes, puis par meilleure série', () => {
    const ranked = rankRows([row('c', 60), row('a', 120, 2), row('d', 0), row('b', 120, 5)])
    expect(ranked.map((r) => r.userId)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('fait partager leur rang aux ex æquo, le suivant saute', () => {
    const ranked = rankRows([row('a', 120), row('b', 120), row('c', 60)])
    expect(ranked.map((r) => r.position)).toEqual([1, 1, 3])
  })

  it('ne modifie pas la liste reçue', () => {
    const input = [row('a', 10), row('b', 20)]
    rankRows(input)
    expect(input.map((r) => [r.userId, r.position])).toEqual([['a', 0], ['b', 0]])
  })
})

describe('début de période (heure locale)', () => {
  // Le mardi 13 octobre 2026 : la semaine commence le lundi 12.
  it('ramène un jeudi, un dimanche ou un lundi au lundi 0 h', () => {
    const monday = new Date(2026, 9, 12).getTime()
    expect(startOfWeekLocal(new Date(2026, 9, 15, 18, 30)).getTime()).toBe(monday)
    expect(startOfWeekLocal(new Date(2026, 9, 18, 23, 59)).getTime()).toBe(monday)
    expect(startOfWeekLocal(new Date(2026, 9, 12, 8, 0)).getTime()).toBe(monday)
  })

  it('ramène au 1er du mois 0 h', () => {
    expect(startOfMonthLocal(new Date(2026, 9, 15, 18)).getTime()).toBe(new Date(2026, 9, 1).getTime())
  })
})
