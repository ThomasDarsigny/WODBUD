import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Notifications push sur cet appareil (migration 039, fonction Edge `push`).
 *
 * La clé publique VAPID est faite pour être publiée : le navigateur la
 * présente au service push. La clé privée n'existe que dans les secrets de
 * la fonction Edge.
 */
export const VAPID_PUBLIC_KEY = 'BEXDsXpBU0-Box4wjSCgWzuWNcAp9rKxEnTQJ_PAcACDXnRD_9aQb4JnoAA5WoYzzL4-MvgCSTHtIPecVQFgr1g'

export type PushState =
  /** Notifications actives sur cet appareil. */
  | 'on'
  /** Possibles, pas encore activées. */
  | 'off'
  /** Refusées dans les réglages du navigateur ou du téléphone. */
  | 'denied'
  /** iPhone/iPad : il faut d'abord ajouter WODBUD à l'écran d'accueil. */
  | 'ios-install'
  /** Navigateur sans push, ou app servie sans service worker (dev local). */
  | 'unsupported'

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function getPushState(): Promise<PushState> {
  // Safari iOS n'expose PushManager qu'une fois l'app ajoutée à l'écran
  // d'accueil (iOS 16.4+) : avant, c'est la seule chose à lui dire.
  if (isIos() && !isStandalone()) return 'ios-install'
  if (!('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  const reg = await registration()
  if (!reg) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

/** Demande la permission, abonne l'appareil et l'enregistre. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'denied'
  if (permission !== 'granted') return 'off'

  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY)
    }))

  const { data } = await getLocalUser()
  if (!data.user) throw new Error('Non authentifié')
  const keys = sub.toJSON().keys ?? {}
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: data.user.id,
      endpoint: sub.endpoint,
      p256dh: keys.p256dh ?? '',
      auth: keys.auth ?? '',
      user_agent: navigator.userAgent.slice(0, 300)
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return 'on'
}

/** Désabonne cet appareil (les autres appareils du compte restent abonnés). */
export async function disablePush(): Promise<PushState> {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'off'
}

export async function sendTestPush(): Promise<{ sent: number }> {
  const { data, error } = await supabase.functions.invoke('push', { body: { type: 'test' } })
  if (error) throw error
  return data as { sent: number }
}

/**
 * Prévient les athlètes d'un cours (vote ouvert, séance programmée).
 * Sans attente ni erreur visible : le vote ou la séance est déjà créé, une
 * notification manquée ne doit pas le faire passer pour un échec.
 */
export function notifyClass(classId: string, kind: 'vote' | 'plan', refId: string): void {
  void supabase.functions
    .invoke('push', { body: { type: 'class', class_id: classId, kind, ref_id: refId } })
    .catch(() => {})
}
