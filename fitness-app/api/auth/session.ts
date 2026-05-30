import type { VercelRequest, VercelResponse } from '@vercel/node'

type SessionBody = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

function toCookie(name: string, value: string, maxAgeSeconds: number): string {
  const encoded = encodeURIComponent(value)
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${name}=${encoded}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ]

  if (isProd) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

function clearCookie(name: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ]

  if (isProd) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin
  const host = req.headers.host

  if (!origin || !host) return true

  try {
    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return false
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!sameOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden origin' })
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as SessionBody
    const accessToken = body.accessToken?.trim()
    const refreshToken = body.refreshToken?.trim()

    if (!accessToken || !refreshToken) {
      return res.status(400).json({ error: 'Missing tokens' })
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const expiresAt = typeof body.expiresAt === 'number' ? body.expiresAt : nowSec + 3600
    const accessMaxAge = Math.max(60, expiresAt - nowSec)
    const refreshMaxAge = 60 * 60 * 24 * 30

    res.setHeader('Set-Cookie', [
      toCookie('sb-access-token', accessToken, accessMaxAge),
      toCookie('sb-refresh-token', refreshToken, refreshMaxAge)
    ])

    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', [
      clearCookie('sb-access-token'),
      clearCookie('sb-refresh-token')
    ])

    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
