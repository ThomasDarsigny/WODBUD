import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REST_CACHE_LIMITS, cacheKey, clearRestCache, createCachedFetch, userFromAuthHeader, type CacheLike, type CacheStorageLike } from './restCache'

const REST = 'https://db.test/rest/v1/'
const DAY = 24 * 60 * 60 * 1000

/** Cache Storage en mémoire : l'ordre d'insertion est gardé, comme dans le navigateur. */
function memoryCaches(): CacheStorageLike & { names: Map<string, Map<string, Response>> } {
  const names = new Map<string, Map<string, Response>>()
  const open = async (name: string): Promise<CacheLike> => {
    const entries = names.get(name) ?? new Map<string, Response>()
    names.set(name, entries)
    return {
      match: async (k) => entries.get(k)?.clone(),
      put: async (k, r) => { entries.delete(k); entries.set(k, r) },
      keys: async () => [...entries.keys()].map((url) => ({ url })),
      delete: async (k) => entries.delete(k)
    }
  }
  return { names, open, keys: async () => [...names.keys()], delete: async (n) => names.delete(n) }
}

function token(sub: string): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `Bearer ${b64({ alg: 'HS256' })}.${b64({ sub, role: 'authenticated' })}.signature`
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const get = (path: string, user = 'u1', accept = 'application/json') => [`${REST}${path}`, { method: 'GET', headers: { Authorization: token(user), Accept: accept } }] as const

describe('lectures gardées de l’app des boutiques (A5)', () => {
  let caches: ReturnType<typeof memoryCaches>
  let now = Date.parse('2026-11-18T10:00:00Z')
  let online = true
  const network = vi.fn<typeof fetch>()
  const cachedFetch = () => createCachedFetch({ restPrefix: REST, caches, fetchImpl: network, now: () => now, isOnline: () => online })
  const saved = { ...REST_CACHE_LIMITS }

  beforeEach(() => {
    caches = memoryCaches()
    now = Date.parse('2026-11-18T10:00:00Z')
    online = true
    network.mockReset()
  })
  afterEach(() => { Object.assign(REST_CACHE_LIMITS, saved) })

  it('garde une lecture réussie et la rend quand le réseau échoue', async () => {
    const f = cachedFetch()
    network.mockResolvedValueOnce(json([{ id: 'fran' }]))
    expect(await (await f(...get('workouts?select=*'))).json()).toEqual([{ id: 'fran' }])

    network.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await (await f(...get('workouts?select=*'))).json()).toEqual([{ id: 'fran' }])
  })

  it('hors ligne : la copie tout de suite, sans tenter le réseau', async () => {
    const f = cachedFetch()
    network.mockResolvedValueOnce(json([1]))
    await f(...get('records'))
    online = false
    expect(await (await f(...get('records'))).json()).toEqual([1])
    expect(network).toHaveBeenCalledTimes(1)
  })

  it('réseau trop lent : la copie après le délai, et la réponse tardive met la copie à jour', async () => {
    REST_CACHE_LIMITS.networkTimeoutMs = 20
    const f = cachedFetch()
    network.mockResolvedValueOnce(json(['ancien']))
    await f(...get('plans'))

    let finish!: (r: Response) => void
    network.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve }))
    expect(await (await f(...get('plans'))).json()).toEqual(['ancien'])
    finish(json(['nouveau']))
    await new Promise((r) => setTimeout(r, 0))
    online = false
    expect(await (await f(...get('plans'))).json()).toEqual(['nouveau'])
  })

  it('réseau lent sans copie : attend le réseau', async () => {
    REST_CACHE_LIMITS.networkTimeoutMs = 5
    network.mockReturnValueOnce(new Promise<Response>((resolve) => setTimeout(() => resolve(json(['tard'])), 30)))
    expect(await (await cachedFetch()(...get('plans'))).json()).toEqual(['tard'])
  })

  it('n’intercepte ni les écritures, ni les fonctions, ni l’authentification', async () => {
    const f = cachedFetch()
    network.mockResolvedValue(json({ ok: true }))
    await f(`${REST}rpc/check_in`, { method: 'POST', headers: { Authorization: token('u1') }, body: '{}' })
    await f(`${REST}workouts`, { method: 'POST', body: '{}' })
    await f('https://db.test/auth/v1/token?grant_type=refresh_token', { method: 'POST' })
    await f('https://db.test/functions/v1/push', { method: 'GET' })
    expect([...caches.names.values()].every((c) => c.size === 0)).toBe(true)

    network.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(f(`${REST}rpc/check_in`, { method: 'POST' })).rejects.toThrow('Failed to fetch')
  })

  it('ne garde pas une erreur du serveur', async () => {
    const f = cachedFetch()
    network.mockResolvedValueOnce(json({ message: 'JWT expired' }, 401))
    await f(...get('profiles'))
    network.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(f(...get('profiles'))).rejects.toThrow('Failed to fetch')
  })

  it('une copie par compte : un autre compte ne lit jamais celle du précédent', async () => {
    const f = cachedFetch()
    network.mockResolvedValueOnce(json(['à u1']))
    await f(...get('scheduled_workouts', 'u1'))
    network.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(f(...get('scheduled_workouts', 'u2'))).rejects.toThrow('Failed to fetch')
  })

  it('« .single() » et la liste de la même adresse restent distincts', async () => {
    const f = cachedFetch()
    network.mockResolvedValueOnce(json([{ id: 1 }]))
    await f(...get('profiles?id=eq.1'))
    network.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(f(...get('profiles?id=eq.1', 'u1', 'application/vnd.pgrst.object+json'))).rejects.toThrow()
  })

  it('une copie de plus de 7 jours n’est plus servie', async () => {
    const f = cachedFetch()
    network.mockResolvedValueOnce(json(['vieux']))
    await f(...get('wods'))
    now += 8 * DAY
    network.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(f(...get('wods'))).rejects.toThrow('Failed to fetch')
  })

  it('au-delà de la limite, les plus anciennes copies partent', async () => {
    REST_CACHE_LIMITS.entries = 2
    const f = cachedFetch()
    for (const path of ['a', 'b', 'c']) {
      network.mockResolvedValueOnce(json([path]))
      await f(...get(path))
    }
    const [entries] = [...caches.names.values()]
    expect([...entries.keys()].map((k) => k.slice(REST.length, REST.length + 1))).toEqual(['b', 'c'])
  })

  it('la déconnexion efface les copies de tous les comptes, rien d’autre', async () => {
    const f = cachedFetch()
    network.mockResolvedValue(json([1]))
    await f(...get('a', 'u1'))
    await f(...get('a', 'u2'))
    await caches.open('autre-chose')
    await clearRestCache(caches)
    expect([...caches.names.keys()]).toEqual(['autre-chose'])
  })

  it('lit le compte dans le jeton, « anon » sinon', () => {
    expect(userFromAuthHeader(token('7d1c-uuid'))).toBe('7d1c-uuid')
    expect(userFromAuthHeader('Bearer pas-un-jeton')).toBe('anon')
    expect(userFromAuthHeader(null)).toBe('anon')
    expect(cacheKey(`${REST}t?a=1`, new Headers({ accept: 'x' }))).toContain('?a=1&__wb_accept=x')
  })
})
