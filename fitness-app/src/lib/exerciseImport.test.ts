import { describe, expect, it, vi } from 'vitest'
import type { Exercise } from '../types'

vi.mock('./supabase', () => ({ supabase: {} }))

const { aggregate, csvToRows, parseCsv, toCategory, toMuscle } = await import('./exerciseImport')

const existing = [
  { id: 'bs', name: 'Back squat' },
  { id: 'th', name: 'Thruster' }
] as Exercise[]

describe('lecture CSV', () => {
  it('reconnaît le point-virgule d’Excel en français, les guillemets et la marque BOM', () => {
    const text = String.fromCharCode(0xfeff) + 'Nom;Notes\r\n"Squat; avant";"Il dit ""genoux"""\r\n\r\nBurpee;\r\n'
    expect(parseCsv(text)).toEqual([['Nom', 'Notes'], ['Squat; avant', 'Il dit "genoux"'], ['Burpee', '']])
  })

  it('trouve les colonnes par leur nom, en français ou en anglais', () => {
    const rows = csvToRows('Exercise,Count,Category,Muscle\nWall walk,4,Gymnastique,épaules\n', 'f.csv')
    expect(rows).toEqual([{
      name: 'Wall walk', category: 'gymnastics', primary_muscle: 'shoulders', description: '',
      occurrences: 4, source: 'csv', label: 'f.csv'
    }])
  })

  it('sans en-tête reconnu, la première colonne est le nom et la première ligne compte', () => {
    expect(csvToRows('Thruster\nBurpee\n', 'f.csv').map((r) => r.name)).toEqual(['Thruster', 'Burpee'])
  })

  it('tolère les valeurs inconnues', () => {
    expect(toCategory('???')).toBe('strength')
    expect(toMuscle('quadriceps')).toBe('quads')
    expect(toMuscle('lower back')).toBe('lower_back')
    expect(toMuscle('n’importe quoi')).toBe('core')
  })
})

describe('fusion et liens', () => {
  const row = (name: string, occurrences = 1) => ({
    name, category: 'strength' as const, primary_muscle: 'core' as const, description: '',
    occurrences, source: 'csv' as const, label: 'f.csv'
  })

  it('additionne les occurrences d’un même nom et trie du plus fréquent au moins fréquent', () => {
    const rows = aggregate([row('wall walk', 2), row('Burpee'), row('Wall Walk', 3)], existing)
    expect(rows.map((r) => [r.name, r.occurrences])).toEqual([['wall walk', 5], ['Burpee', 1]])
  })

  it('relie un doublon exact ou un nom proche à l’existant, au lieu de le créer', () => {
    const [exact, similar, fresh] = aggregate([row('back squat', 3), row('Thrusters', 2), row('Wall walk')], existing)
    expect([exact.match.kind, exact.selected]).toEqual(['exact', false])
    expect(exact.match.kind !== 'none' && exact.match.exercise.id).toBe('bs')
    expect([similar.match.kind, similar.selected]).toEqual(['similar', false])
    expect([fresh.match.kind, fresh.selected]).toEqual(['none', true])
  })
})
