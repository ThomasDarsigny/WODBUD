/**
 * Lectures Supabase gardées sur le téléphone, dans l'app des boutiques (A5).
 *
 * Sur le site, le service worker s'en charge (vite.config.ts, cache
 * « supabase-rest-v1 ») ; l'app n'a pas de service worker. Même stratégie,
 * passée au client Supabase comme son `fetch` :
 *
 * - lectures seulement (GET sur /rest/v1/), réponses 200 ;
 * - le réseau d'abord ; la copie gardée s'il ne répond pas en 4 s, s'il
 *   échoue, ou si le téléphone se sait hors ligne ;
 * - 200 réponses au plus, 7 jours au plus ;
 * - une copie par compte (tirée du jeton), toutes effacées à la déconnexion.
 *
 * Écrit contre une interface minimale de Cache Storage pour être testé sans
 * navigateur (restCache.test.ts) ; le navigateur fournit le vrai `caches`.
 */

export interface CacheLike {
  match(request: string): Promise<Response | undefined>
  put(request: string, response: Response): Promise<void>
  keys(): Promise<ReadonlyArray<{ url: string }>>
  delete(request: string): Promise<boolean>
}

export interface CacheStorageLike {
  open(name: string): Promise<CacheLike>
  keys(): Promise<string[]>
  delete(name: string): Promise<boolean>
}

const PREFIX = 'wodbud-rest-v1:'
const STAMP = 'x-wodbud-cached-at'
export const REST_CACHE_LIMITS = { entries: 200, maxAgeMs: 7 * 24 * 60 * 60 * 1000, networkTimeoutMs: 4000 }

/** Compte du jeton (`sub`), sinon « anon » : chaque compte a sa copie. */
export function userFromAuthHeader(value: string | null): string {
  const token = value?.match(/^Bearer\s+(.+)$/i)?.[1]
  const payload = token?.split('.')[1]
  if (!payload) return 'anon'
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='))) as { sub?: unknown }
    return typeof json.sub === 'string' && /^[\w-]{1,64}$/.test(json.sub) ? json.sub : 'anon'
  } catch {
    return 'anon'
  }
}

/**
 * Clé de la copie : l'adresse, plus les en-têtes qui changent la forme de la
 * réponse (`.single()` demande un objet au lieu d'une liste). Jamais envoyée.
 */
export function cacheKey(url: string, headers: Headers): string {
  const extra = new URLSearchParams()
  extra.set('__wb_accept', headers.get('accept') ?? '')
  extra.set('__wb_prefer', headers.get('prefer') ?? '')
  return `${url}${url.includes('?') ? '&' : '?'}${extra.toString()}`
}

function describe(input: RequestInfo | URL, init?: RequestInit): { url: string; method: string; headers: Headers } {
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return { url: input.url, method: (init?.method ?? input.method).toUpperCase(), headers: new Headers(init?.headers ?? input.headers) }
  }
  return { url: String(input), method: (init?.method ?? 'GET').toUpperCase(), headers: new Headers(init?.headers) }
}

async function store(cache: CacheLike, key: string, response: Response, now: number): Promise<void> {
  const headers = new Headers(response.headers)
  headers.set(STAMP, String(now))
  const copy = new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers })
  await cache.put(key, copy)
  // Les plus anciennes écritures partent d'abord.
  const keys = await cache.keys()
  for (const old of keys.slice(0, Math.max(0, keys.length - REST_CACHE_LIMITS.entries))) await cache.delete(old.url)
}

export function createCachedFetch(options: {
  restPrefix: string
  caches: CacheStorageLike
  fetchImpl?: typeof fetch
  now?: () => number
  isOnline?: () => boolean
}): typeof fetch {
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const now = options.now ?? Date.now
  const isOnline = options.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false)

  return async (input, init) => {
    const { url, method, headers } = describe(input, init)
    if (method !== 'GET' || !url.startsWith(options.restPrefix)) return fetchImpl(input, init)

    let cache: CacheLike
    try {
      cache = await options.caches.open(PREFIX + userFromAuthHeader(headers.get('authorization')))
    } catch {
      return fetchImpl(input, init)
    }
    const key = cacheKey(url, headers)

    const fromCache = async (): Promise<Response | null> => {
      try {
        const hit = await cache.match(key)
        const at = Number(hit?.headers.get(STAMP))
        return hit && at && now() - at <= REST_CACHE_LIMITS.maxAgeMs ? hit : null
      } catch {
        return null
      }
    }

    if (!isOnline()) {
      const hit = await fromCache()
      if (hit) return hit
    }

    const network = fetchImpl(input, init).then(async (response) => {
      if (response.status === 200) {
        try { await store(cache, key, response.clone(), now()) } catch { /* copie en prime, jamais bloquante */ }
      }
      return response
    })
    // Si la copie a déjà répondu, un échec tardif du réseau n'est pas une erreur.
    network.catch(() => {})

    let timer: ReturnType<typeof setTimeout> | undefined
    const slow = new Promise<Response>((resolve, reject) => {
      timer = setTimeout(() => {
        void fromCache().then((hit) => (hit ? resolve(hit) : network.then(resolve, reject)))
      }, REST_CACHE_LIMITS.networkTimeoutMs)
    })

    try {
      return await Promise.race([network, slow])
    } catch (err) {
      const hit = await fromCache()
      if (hit) return hit
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}

/** Déconnexion : les copies de tous les comptes disparaissent. */
export async function clearRestCache(caches: CacheStorageLike): Promise<void> {
  try {
    const names = await caches.keys()
    await Promise.all(names.filter((n) => n.startsWith(PREFIX)).map((n) => caches.delete(n)))
  } catch {
    // Cache Storage indisponible : rien à effacer.
  }
}
