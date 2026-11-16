import { PushNotifications, type PushNotificationSchema } from '@capacitor/push-notifications'
import { supabase } from './supabase'
import type { PushState } from './push'

/**
 * Notifications de l'app des boutiques (A4) : Firebase Cloud Messaging sur
 * Android. Le téléphone reçoit un jeton, enregistré par
 * register_device_token (migration 073) ; la fonction Edge `push` y envoie
 * les mêmes messages que les notifications web.
 *
 * Firebase n'existe dans l'app que si `android/app/google-services.json` était
 * là à la construction (scripts/android.mjs pose alors VITE_NATIVE_PUSH=on) :
 * sans lui, demander un jeton ferait planter le plugin. Chargé seulement dans
 * l'app (import dynamique depuis push.ts et nativeShell.ts).
 */

export const nativePushConfigured = import.meta.env.VITE_NATIVE_PUSH === 'on'

const TOKEN_KEY = 'wodbud_device_token'
const CHANNEL = 'wodbud'

function savedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function saveToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* stockage indisponible */ }
}

export async function nativePushState(): Promise<PushState> {
  if (!nativePushConfigured) return 'app-soon'
  const { receive } = await PushNotifications.checkPermissions()
  if (receive === 'denied') return 'denied'
  return receive === 'granted' && savedToken() ? 'on' : 'off'
}

/** Canal « WODBUD » (Android 8+) : celui que vise la fonction `push`. */
async function ensureChannel(): Promise<void> {
  try {
    await PushNotifications.createChannel({
      id: CHANNEL,
      name: 'WODBUD',
      description: 'Votes, séances programmées, rappels et invitations',
      importance: 4,
      visibility: 1
    })
  } catch { /* Android 7 : pas de canaux */ }
}

/** Jeton de Firebase, après `register()` : 15 s au plus. */
function nextToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const handles = [
      PushNotifications.addListener('registration', (t) => finish(() => resolve(t.value))),
      PushNotifications.addListener('registrationError', (e) => finish(() => reject(new Error(e.error))))
    ]
    const timer = setTimeout(() => finish(() => reject(new Error('push_timeout'))), 15000)
    function finish(then: () => void) {
      clearTimeout(timer)
      for (const h of handles) void h.then((x) => x.remove())
      then()
    }
  })
}

async function registerToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('register_device_token', { p_token: token, p_platform: 'android' })
  if (error) throw error
  saveToken(token)
}

export async function enableNativePush(): Promise<PushState> {
  if (!nativePushConfigured) return 'app-soon'
  let { receive } = await PushNotifications.checkPermissions()
  if (receive === 'prompt' || receive === 'prompt-with-rationale') receive = (await PushNotifications.requestPermissions()).receive
  if (receive === 'denied') return 'denied'
  if (receive !== 'granted') return 'off'
  await ensureChannel()
  const token = nextToken()
  await PushNotifications.register()
  await registerToken(await token)
  return 'on'
}

/**
 * Ce téléphone ne reçoit plus rien pour ce compte : réglages, et avant la
 * déconnexion (lib/signOut.ts), tant que la session permet encore d'effacer
 * la ligne.
 */
export async function forgetDevice(): Promise<void> {
  const token = savedToken()
  saveToken(null)
  if (!nativePushConfigured || !token) return
  await supabase.from('device_tokens').delete().eq('token', token)
  try { await PushNotifications.unregister() } catch { /* déjà retiré */ }
}

export async function disableNativePush(): Promise<PushState> {
  await forgetDevice()
  return 'off'
}

/** Notification reçue app ouverte : Android ne l'affiche pas, la bannière le fait. */
export interface ForegroundPush { title: string; body: string; url: string | null }
export const FOREGROUND_PUSH_EVENT = 'wodbud:push'

function foreground(n: PushNotificationSchema): ForegroundPush {
  const url = typeof n.data?.url === 'string' && n.data.url.startsWith('/') ? n.data.url : null
  return { title: n.title ?? 'WODBUD', body: n.body ?? '', url }
}

/** Mène à une page de l'app, avant comme après le démarrage du routeur. */
export function openInApp(path: string): void {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** À l'ouverture de l'app (nativeShell.ts). */
export function initNativePush(): void {
  if (!nativePushConfigured) return
  void ensureChannel()

  // Toucher une notification, app fermée ou en arrière-plan : sa page.
  void PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const { url } = foreground(notification)
    if (url) openInApp(url)
  })

  void PushNotifications.addListener('pushNotificationReceived', (notification) => {
    window.dispatchEvent(new CustomEvent<ForegroundPush>(FOREGROUND_PUSH_EVENT, { detail: foreground(notification) }))
  })

  // Firebase renouvelle parfois le jeton : notifications actives, on
  // redemande le jeton courant à chaque ouverture et on le réinscrit.
  if (savedToken()) {
    void PushNotifications.checkPermissions().then(async ({ receive }) => {
      if (receive !== 'granted') return
      const token = nextToken()
      await PushNotifications.register()
      await registerToken(await token)
    }).catch(() => { /* hors ligne : réessayé à la prochaine ouverture */ })
  }
}
