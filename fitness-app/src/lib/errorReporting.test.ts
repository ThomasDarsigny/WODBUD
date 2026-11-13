import { describe as suite, expect, it } from 'vitest'
import { describe, isNoise, scrubPath } from './errorReporting'
import { groupClientErrors } from './clientErrors'

suite('scrubPath', () => {
  it('masque jetons et identifiants, garde la forme de la page', () => {
    expect(scrubPath('/join/e2e-invite-token-1234567')).toBe('/join/:id')
    expect(scrubPath('/dashboard/communities/c0aa0000-0000-4000-8000-000000000001')).toBe('/dashboard/communities/:id')
    expect(scrubPath('/presence/123456')).toBe('/presence/:id')
    expect(scrubPath('/dashboard/today')).toBe('/dashboard/today')
  })
})

suite('isNoise', () => {
  it('écarte le bruit des navigateurs et des extensions', () => {
    expect(isNoise('ResizeObserver loop completed with undelivered notifications.')).toBe(true)
    expect(isNoise('Script error.')).toBe(true)
    expect(isNoise('boom', 'at chrome-extension://abc/content.js:1:1')).toBe(true)
    expect(isNoise('')).toBe(true)
    expect(isNoise("Cannot read properties of undefined (reading 'name')")).toBe(false)
  })
})

suite('describe', () => {
  it('lit une Error, une chaîne ou une valeur quelconque', () => {
    expect(describe(new TypeError('x is undefined')).message).toBe('TypeError: x is undefined')
    expect(describe(new Error('plain')).message).toBe('plain')
    expect(describe('texte')).toEqual({ message: 'texte' })
    expect(describe({ code: 42 }).message).toBe('{"code":42}')
  })
})

suite('groupClientErrors', () => {
  it('regroupe par type et message, du plus récent au plus ancien', () => {
    const rows = [
      { id: 1, created_at: '2026-11-10T10:00:00Z', kind: 'error', message: 'A', path: '/a', app_version: 'v1' },
      { id: 2, created_at: '2026-11-12T10:00:00Z', kind: 'error', message: 'A', path: '/b', app_version: 'v2' },
      { id: 3, created_at: '2026-11-11T10:00:00Z', kind: 'render', message: 'B', path: '/a', app_version: 'v2' }
    ]
    const g = groupClientErrors(rows)
    expect(g.map((x) => [x.message, x.count])).toEqual([['A', 2], ['B', 1]])
    expect(g[0]).toMatchObject({ lastAt: '2026-11-12T10:00:00Z', paths: ['/a', '/b'], versions: ['v1', 'v2'] })
  })
})
