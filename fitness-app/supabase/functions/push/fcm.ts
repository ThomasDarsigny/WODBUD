/**
 * Envoi par Firebase Cloud Messaging (API HTTP v1) aux appareils de l'app
 * des boutiques (migration 073, A4).
 *
 * Le secret `FCM_SERVICE_ACCOUNT` est le fichier JSON d'un compte de service
 * du projet Firebase (Paramètres du projet → Comptes de service). On en tire
 * un jeton d'accès OAuth (JWT signé RS256, échangé chez Google, gardé une
 * heure), puis chaque message part vers
 * fcm.googleapis.com/v1/projects/<projet>/messages:send.
 *
 * Sans dépendance ni API propre à Deno (WebCrypto et fetch seulement) : le
 * module est testé avec Vitest (fcm.test.ts).
 */

export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

export interface FcmPayload {
  title: string
  body: string
  url: string
  tag: string
}

/** 'sent', 'gone' (jeton périmé : à supprimer) ou 'failed' (à réessayer plus tard). */
export type FcmResult = 'sent' | 'gone' | 'failed'

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null
  try {
    const sa = JSON.parse(raw) as Partial<ServiceAccount>
    return sa.project_id && sa.client_email && sa.private_key
      ? { project_id: sa.project_id, client_email: sa.client_email, private_key: sa.private_key }
      : null
  } catch {
    return null
  }
}

function base64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  let bin = ''
  for (const b of raw) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\\n|\s/g, '')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

/** Assertion JWT signée par la clé du compte de service. */
export async function signedAssertion(sa: ServiceAccount, nowSeconds: number): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }))
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  return `${header}.${claims}.${base64url(new Uint8Array(signature))}`
}

let cached: { email: string; token: string; expiresAt: number } | null = null

/** Jeton d'accès OAuth, réutilisé jusqu'à une minute avant son expiration. */
export async function accessToken(sa: ServiceAccount, fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<string> {
  if (cached && cached.email === sa.client_email && cached.expiresAt - 60_000 > now) return cached.token
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await signedAssertion(sa, Math.floor(now / 1000))
    })
  })
  const data = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string }
  if (!res.ok || !data.access_token) throw new Error(`OAuth FCM refusé (${res.status} ${data.error ?? ''})`.trim())
  cached = { email: sa.client_email, token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 }
  return data.access_token
}

/** Pour les tests : oublie le jeton d'accès gardé. */
export function resetAccessTokenCache(): void {
  cached = null
}

/** Le message FCM : notification affichée par Android, lien gardé pour le toucher. */
export function fcmMessage(token: string, payload: FcmPayload) {
  return {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      data: { url: payload.url, tag: payload.tag },
      android: {
        ttl: `${60 * 60 * 12}s`,
        notification: {
          tag: payload.tag,
          channel_id: 'wodbud',
          icon: 'ic_stat_wodbud',
          color: '#FF5A1F'
        }
      }
    }
  }
}

export async function sendFcm(
  sa: ServiceAccount,
  token: string,
  payload: FcmPayload,
  fetchImpl: typeof fetch = fetch
): Promise<FcmResult> {
  const res = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(sa, fetchImpl)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(fcmMessage(token, payload))
  })
  if (res.ok) return 'sent'
  const error = await res.json().catch(() => ({})) as { error?: { status?: string; message?: string; details?: Array<{ errorCode?: string }> } }
  const codes = [error.error?.status, ...(error.error?.details ?? []).map((d) => d.errorCode)]
  // Jeton inconnu de FCM (app désinstallée, données effacées) ou mal formé.
  // Un autre argument invalide serait une erreur de notre message : on ne
  // supprime pas le jeton pour autant.
  const badToken = res.status === 400 && codes.includes('INVALID_ARGUMENT') && /registration token/i.test(error.error?.message ?? '')
  if (res.status === 404 || codes.includes('UNREGISTERED') || badToken) return 'gone'
  console.error('FCM échoué', res.status, codes.filter(Boolean).join(','))
  return 'failed'
}
