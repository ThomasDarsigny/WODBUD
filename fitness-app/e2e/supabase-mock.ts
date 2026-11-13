import type { Page, Route } from '@playwright/test'

/**
 * Supabase simulé pour les tests de bout en bout (phase 4, 4.1).
 *
 * Aucun appel ne sort de la machine : l'app est servie avec
 * VITE_SUPABASE_URL=http://supabase.test et chaque requête vers cette adresse
 * est interceptée ici. Une petite base en mémoire répond comme PostgREST
 * (filtres eq, in, gte…, tri, ligne unique, comptes) et garde la trace de
 * toutes les écritures, que les tests vérifient ensuite. Le dépôt est
 * public : aucun identifiant réel n'est utilisé.
 */
export const SUPABASE_URL = 'http://supabase.test'
/** supabase-js range la session sous sb-<premier mot de l'hôte>-auth-token. */
const STORAGE_KEY = 'sb-supabase-auth-token'

export type Row = Record<string, unknown>
export interface Write { method: 'POST' | 'PATCH' | 'DELETE'; table: string; rows: Row[] }
export interface RpcCall { fn: string; args: Record<string, unknown> }
export interface MockUser { id: string; email: string; fullName: string }
type RpcHandler = (args: Record<string, unknown>, db: MockSupabase) => unknown

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, HEAD, OPTIONS',
  'access-control-expose-headers': 'content-range, x-total-count'
}
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and'])
const FAR_FUTURE = Math.floor(Date.UTC(2100, 0, 1) / 1000)

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function session(user: MockUser) {
  const access = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: FAR_FUTURE })}.e2e`
  return {
    access_token: access,
    refresh_token: 'e2e-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: FAR_FUTURE,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: user.fullName },
      created_at: '2026-01-01T00:00:00Z'
    }
  }
}

function asNumberPair(a: unknown, b: string): [number, number] | null {
  const x = Number(a)
  const y = Number(b)
  return typeof a !== 'boolean' && a !== null && a !== '' && !Number.isNaN(x) && !Number.isNaN(y) ? [x, y] : null
}

/** Un filtre PostgREST (« eq.x », « in.(a,b) », « gte.2026-11-16 »…) sur une ligne. */
function matches(row: Row, key: string, expr: string): boolean {
  // Filtres sur une table jointe (« classes.coach_id ») ou colonne absente des données de test : on laisse passer.
  if (key.includes('.') || !(key in row)) return true
  const value = row[key]
  const dot = expr.indexOf('.')
  const op = expr.slice(0, dot)
  const arg = decodeURIComponent(expr.slice(dot + 1))
  const cmp = (fn: (a: number, b: number) => boolean, sfn: (a: string, b: string) => boolean) => {
    const nums = asNumberPair(value, arg)
    return nums ? fn(nums[0], nums[1]) : sfn(String(value), arg)
  }
  switch (op) {
    case 'eq': return String(value) === arg
    case 'neq': return String(value) !== arg
    case 'gt': return cmp((a, b) => a > b, (a, b) => a > b)
    case 'gte': return cmp((a, b) => a >= b, (a, b) => a >= b)
    case 'lt': return cmp((a, b) => a < b, (a, b) => a < b)
    case 'lte': return cmp((a, b) => a <= b, (a, b) => a <= b)
    case 'is': return arg === 'null' ? value == null : String(value) === arg
    case 'in': return arg.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(value))
    case 'ilike': return new RegExp(`^${arg.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i').test(String(value ?? ''))
    default: return true
  }
}

export class MockSupabase {
  tables: Record<string, Row[]> = {}
  rpc: Record<string, RpcHandler> = {}
  writes: Write[] = []
  calls: RpcCall[] = []
  /** Appels à l'authentification (connexion, inscription, renvoi du courriel), avec leur corps. */
  authCalls: { path: string; body: Row }[] = []
  /** Erreur à renvoyer pour un chemin d'authentification, comme GoTrue (ex. invalid_credentials). */
  authErrors: Record<string, { status: number; code: string; message: string }> = {}
  signedIn: boolean
  readonly user: MockUser
  private seq = 0

  constructor(user: MockUser, init: { tables?: Record<string, Row[]>; rpc?: Record<string, RpcHandler>; signedIn?: boolean } = {}) {
    this.user = user
    for (const [name, rows] of Object.entries(init.tables ?? {})) this.tables[name] = rows.map((r) => ({ ...r }))
    this.rpc = { ...(init.rpc ?? {}) }
    this.signedIn = init.signedIn ?? true
  }

  table(name: string): Row[] {
    return (this.tables[name] ??= [])
  }

  writesTo(table: string, method?: Write['method']): Row[] {
    return this.writes.filter((w) => w.table === table && (!method || w.method === method)).flatMap((w) => w.rows)
  }

  /** Branche la fausse base sur la page, avant toute navigation. */
  async install(page: Page): Promise<void> {
    const signedIn = this.signedIn
    const stored = JSON.stringify(session(this.user))
    await page.addInitScript(([key, value, withSession]) => {
      try {
        localStorage.setItem('wodbud_lang', 'fr')
        if (withSession && !localStorage.getItem(key)) localStorage.setItem(key, value)
      } catch { /* stockage indisponible */ }
    }, [STORAGE_KEY, stored, signedIn] as const)

    // Les modules servis par Vite (localhost, des centaines en dev) ne passent pas par
    // l'interception : la faire transiter par Playwright ralentissait la suite en parallèle
    // jusqu'à faire expirer des chargements. Seul ce qui sortirait de la machine est routé.
    const local = (url: URL) => url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    await page.route((url) => !local(url), async (route) => {
      const url = new URL(route.request().url())
      if (url.origin === SUPABASE_URL) return this.handle(route, url)
      // Rien ne sort : polices, analytics, etc.
      return route.abort()
    })
  }

  private reply(route: Route, status: number, body?: unknown, headers: Record<string, string> = {}) {
    return route.fulfill({
      status,
      headers: { ...CORS, 'content-type': 'application/json', ...headers },
      body: body === undefined ? '' : JSON.stringify(body)
    })
  }

  private async handle(route: Route, url: URL) {
    const req = route.request()
    const method = req.method()
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const path = url.pathname

    if (path.startsWith('/auth/v1/')) return this.auth(route, url)
    if (path.startsWith('/functions/v1/')) return this.reply(route, 200, {})
    if (path.startsWith('/storage/v1/')) return this.reply(route, 404, { message: 'not found' })
    if (path.startsWith('/rest/v1/rpc/')) {
      const fn = path.slice('/rest/v1/rpc/'.length)
      const args = (req.postDataJSON() ?? {}) as Record<string, unknown>
      this.calls.push({ fn, args })
      const handler = this.rpc[fn]
      return this.reply(route, 200, handler ? handler(args, this) ?? null : [])
    }
    if (path.startsWith('/rest/v1/')) return this.rest(route, url, path.slice('/rest/v1/'.length))
    return route.abort()
  }

  private auth(route: Route, url: URL) {
    const path = url.pathname
    const req = route.request()
    if (req.method() !== 'GET') this.authCalls.push({ path, body: (req.postDataJSON() ?? {}) as Row })
    const fail = this.authErrors[path]
    if (fail) return this.reply(route, fail.status, { code: fail.status, error_code: fail.code, msg: fail.message })
    if (path === '/auth/v1/token') {
      this.signedIn = true
      return this.reply(route, 200, session(this.user))
    }
    if (path === '/auth/v1/user') return this.signedIn ? this.reply(route, 200, session(this.user).user) : this.reply(route, 401, { message: 'not signed in' })
    if (path === '/auth/v1/logout') { this.signedIn = false; return this.reply(route, 204) }
    return this.reply(route, 200, {})
  }

  private filtered(table: string, url: URL): Row[] {
    let rows = this.table(table)
    for (const [key, expr] of url.searchParams) {
      if (RESERVED.has(key)) continue
      rows = rows.filter((r) => matches(r, key, expr))
    }
    return rows
  }

  private rest(route: Route, url: URL, table: string) {
    const req = route.request()
    const method = req.method()
    const headers = req.headers()
    const prefer = headers['prefer'] ?? ''
    const wantsObject = (headers['accept'] ?? '').includes('vnd.pgrst.object')
    const representation = prefer.includes('return=representation')
    const respondRows = (rows: Row[], status: number) => {
      if (wantsObject) {
        if (rows.length !== 1) return this.reply(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `${rows.length} rows`, hint: null })
        return this.reply(route, status, rows[0])
      }
      return this.reply(route, status, rows)
    }

    if (method === 'GET' || method === 'HEAD') {
      let rows = this.filtered(table, url)
      const order = url.searchParams.get('order')
      if (order) {
        const [col, dir] = order.split(',')[0].split('.')
        rows = [...rows].sort((a, b) => (String(a[col] ?? '') < String(b[col] ?? '') ? -1 : String(a[col] ?? '') > String(b[col] ?? '') ? 1 : 0) * (dir === 'desc' ? -1 : 1))
      }
      const limit = url.searchParams.get('limit')
      if (limit) rows = rows.slice(0, Number(limit))
      const range = { 'content-range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0' }
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...CORS, ...range } })
      if (wantsObject) return respondRows(rows, 200)
      return this.reply(route, 200, rows, range)
    }

    if (method === 'POST') {
      const body = req.postDataJSON() as Row | Row[]
      const incoming = Array.isArray(body) ? body : [body]
      const conflict = url.searchParams.get('on_conflict')?.split(',')
      const ignore = prefer.includes('resolution=ignore-duplicates')
      const merge = prefer.includes('resolution=merge-duplicates')
      const stored: Row[] = []
      for (const raw of incoming) {
        const existing = conflict ? this.table(table).find((r) => conflict.every((c) => String(r[c]) === String(raw[c]))) : undefined
        if (existing) {
          if (merge) { Object.assign(existing, raw); stored.push(existing) }
          else if (!ignore) return this.reply(route, 409, { code: '23505', message: 'duplicate key value violates unique constraint' })
          continue
        }
        const row = { id: `e2e-${table}-${++this.seq}`, created_at: new Date().toISOString(), ...raw }
        this.table(table).push(row)
        stored.push(row)
      }
      this.writes.push({ method: 'POST', table, rows: stored })
      return representation ? respondRows(stored, 201) : this.reply(route, 201)
    }

    if (method === 'PATCH') {
      const patch = req.postDataJSON() as Row
      const rows = this.filtered(table, url)
      for (const r of rows) Object.assign(r, patch)
      this.writes.push({ method: 'PATCH', table, rows })
      return representation ? respondRows(rows, 200) : this.reply(route, 204)
    }

    if (method === 'DELETE') {
      const rows = this.filtered(table, url)
      this.tables[table] = this.table(table).filter((r) => !rows.includes(r))
      this.writes.push({ method: 'DELETE', table, rows })
      return representation ? respondRows(rows, 200) : this.reply(route, 204)
    }

    return this.reply(route, 405, { message: 'method not allowed' })
  }
}
