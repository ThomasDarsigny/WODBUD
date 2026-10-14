import { describe, expect, it, vi } from 'vitest'
import type { JournalEntry } from './journal'

vi.mock('./supabase', () => ({ supabase: {} }))

const { groupByMonth } = await import('./journal')

function entry(id: string, date: Date, minutes: number): JournalEntry {
  return {
    id, performed_at: date.toISOString(), active_minutes: minutes, duration_minutes: minutes,
    notes: null, title: null, kind: 'free', planned: false
  }
}

describe('journal regroupé par mois', () => {
  it('regroupe dans l’ordre reçu et totalise les minutes', () => {
    const months = groupByMonth([
      entry('1', new Date(2026, 9, 13, 12), 30),
      entry('2', new Date(2026, 9, 2, 12), 20),
      entry('3', new Date(2026, 8, 28, 12), 10)
    ], 'fr')

    expect(months.map((m) => [m.key, m.entries.length, m.minutes])).toEqual([
      ['2026-10', 2, 50],
      ['2026-09', 1, 10]
    ])
    expect(months[0].label.toLowerCase()).toContain('octobre 2026')
  })

  it('renvoie une liste vide sans séance', () => {
    expect(groupByMonth([], 'fr')).toEqual([])
  })
})
