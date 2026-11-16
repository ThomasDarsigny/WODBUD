import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accessToken, fcmMessage, parseServiceAccount, resetAccessTokenCache, sendFcm, signedAssertion, type ServiceAccount } from './fcm'

/** Compte de service factice : une vraie paire de clés, générée pour le test. */
async function fakeAccount(): Promise<{ sa: ServiceAccount; publicKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  )
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  let bin = ''
  for (const b of der) bin += String.fromCharCode(b)
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin).match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`
  return { sa: { project_id: 'wodbud-test', client_email: 'push@wodbud-test.iam.gserviceaccount.com', private_key: pem }, publicKey: pair.publicKey }
}

const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
const payload = { title: 'Nouveau vote — CrossFit 6h', body: 'Choisis le WOD : Fran', url: '/athlete/vote/v1', tag: 'vote-v1' }

describe('FCM (notifications de l’app des boutiques)', () => {
  beforeEach(() => { resetAccessTokenCache() })

  it('lit le compte de service, refuse un secret incomplet', () => {
    expect(parseServiceAccount(undefined)).toBeNull()
    expect(parseServiceAccount('pas du json')).toBeNull()
    expect(parseServiceAccount('{"project_id":"p"}')).toBeNull()
    expect(parseServiceAccount('{"project_id":"p","client_email":"e","private_key":"k","autre":1}')).toEqual({ project_id: 'p', client_email: 'e', private_key: 'k' })
  })

  it('signe une assertion que la clé publique vérifie, pour la portée FCM', async () => {
    const { sa, publicKey } = await fakeAccount()
    const jwt = await signedAssertion(sa, 1_800_000_000)
    const [h, c, s] = jwt.split('.')
    expect(decode(h)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decode(c)).toEqual({
      iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token', iat: 1_800_000_000, exp: 1_800_003_600
    })
    const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0))
    expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, sig, new TextEncoder().encode(`${h}.${c}`))).toBe(true)
  })

  it('accepte une clé aux sauts de ligne échappés (secret collé sur une ligne)', async () => {
    const { sa } = await fakeAccount()
    await expect(signedAssertion({ ...sa, private_key: sa.private_key.replace(/\n/g, '\\n') }, 1)).resolves.toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })

  it('échange l’assertion contre un jeton d’accès, gardé jusqu’à son expiration', async () => {
    const { sa } = await fakeAccount()
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ access_token: 'ya29.x', expires_in: 3600 })))
    expect(await accessToken(sa, fetchImpl, 0)).toBe('ya29.x')
    expect(await accessToken(sa, fetchImpl, 30 * 60 * 1000)).toBe('ya29.x')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const body = new URLSearchParams(String(fetchImpl.mock.calls[0][1]?.body))
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(body.get('assertion')?.split('.')).toHaveLength(3)

    fetchImpl.mockResolvedValue(new Response(JSON.stringify({ access_token: 'ya29.y', expires_in: 3600 })))
    expect(await accessToken(sa, fetchImpl, 3600 * 1000)).toBe('ya29.y')
  })

  it('construit le message : notification, lien, canal, icône et durée de vie', () => {
    expect(fcmMessage('tok', payload)).toEqual({
      message: {
        token: 'tok',
        notification: { title: payload.title, body: payload.body },
        data: { url: '/athlete/vote/v1', tag: 'vote-v1' },
        android: { ttl: '43200s', notification: { tag: 'vote-v1', channel_id: 'wodbud', icon: 'ic_stat_wodbud', color: '#FF5A1F' } }
      }
    })
  })

  it('envoie au projet du compte de service ; distingue jeton périmé et échec passager', async () => {
    const { sa } = await fakeAccount()
    const oauth = () => new Response(JSON.stringify({ access_token: 'ya29.z', expires_in: 3600 }))
    const fcm = vi.fn<typeof fetch>(async (url) => (String(url).startsWith('https://oauth2') ? oauth() : new Response('{}')))
    expect(await sendFcm(sa, 'tok', payload, fcm)).toBe('sent')
    const [url, init] = fcm.mock.calls[1]
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/wodbud-test/messages:send')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ya29.z')

    const reply = (status: number, error: object) => vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ error }), { status }))
    expect(await sendFcm(sa, 'tok', payload, reply(404, { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] }))).toBe('gone')
    expect(await sendFcm(sa, 'tok', payload, reply(400, { status: 'INVALID_ARGUMENT', message: 'The registration token is not a valid FCM registration token' }))).toBe('gone')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await sendFcm(sa, 'tok', payload, reply(400, { status: 'INVALID_ARGUMENT', message: 'Invalid value at message.android.ttl' }))).toBe('failed')
    expect(await sendFcm(sa, 'tok', payload, reply(503, { status: 'UNAVAILABLE' }))).toBe('failed')
  })
})
