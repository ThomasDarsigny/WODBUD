import { describe, expect, it } from 'vitest'
import { computeProgress, formatMinutes, rankDisplay, rankMotto, type Rank } from './ranks'

function rank(key: string, min_minutes: number, extra: Partial<Rank> = {}): Rank {
  return {
    position: 0, key, min_minutes, color: '#000',
    display_fr: `${key}-fr`, display_en: `${key}-en`, display_es: `${key}-es`,
    motto_fr: `${key} devise`, motto_en: null, motto_es: null,
    ...extra
  }
}

// Volontairement dans le désordre : l'échelle venant de la base, le calcul ne
// doit pas dépendre de l'ordre des lignes.
const ladder = [rank('c', 900), rank('a', 0), rank('b', 300)]

describe('progression de rang', () => {
  it('part du premier rang', () => {
    const p = computeProgress(ladder, 0)
    expect([p.current?.key, p.next?.key, p.ratio, p.remaining]).toEqual(['a', 'b', 0, 300])
  })

  it('calcule la progression vers le rang suivant', () => {
    const p = computeProgress(ladder, 150)
    expect([p.current?.key, p.ratio, p.remaining]).toEqual(['a', 0.5, 150])
  })

  it('change de rang pile au seuil', () => {
    const p = computeProgress(ladder, 300)
    expect([p.current?.key, p.next?.key, p.ratio, p.remaining]).toEqual(['b', 'c', 0, 600])
  })

  it('plafonne au dernier rang', () => {
    const p = computeProgress(ladder, 5_000)
    expect([p.current?.key, p.next, p.ratio, p.remaining]).toEqual(['c', null, 1, 0])
  })

  it('traite des minutes négatives comme zéro', () => {
    expect(computeProgress(ladder, -50).remaining).toBe(300)
  })

  it('ne plante pas sans échelle', () => {
    expect(computeProgress([], 100)).toEqual({ current: null, next: null, ratio: 0, remaining: 0 })
  })
})

describe('affichage des rangs', () => {
  it('choisit la langue, avec repli sur le français', () => {
    const r = rank('x', 0)
    expect(rankDisplay(r, 'en-US')).toBe('x-en')
    expect(rankDisplay(r, 'es')).toBe('x-es')
    expect(rankDisplay(r, 'de')).toBe('x-fr')
    expect(rankMotto(r, 'es')).toBe('x devise')
  })

  it('formate les durées', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(180)).toBe('3 h')
    expect(formatMinutes(200)).toBe('3 h 20')
    expect(formatMinutes(59.6)).toBe('1 h')
  })
})
