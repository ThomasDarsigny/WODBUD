/**
 * Suivi des erreurs (4.5), sans service tiers.
 *
 * Les erreurs non attrapées, les promesses rejetées sans gestionnaire et les
 * écrans qui plantent (ErrorBoundary) sont envoyés à la fonction Supabase
 * `log_client_error` (migration 070), qui valide, tronque, limite la fréquence
 * et purge après 90 jours. Lecture : administrateurs, dans le tableau de bord.
 *
 * Vie privée : la page est envoyée sans paramètres ni ancre, et les segments
 * qui ressemblent à un jeton ou à un identifiant (invitation, rang partagé,
 * présence) sont masqués. Ni contenu saisi, ni courriel.
 */
import { supabase } from './supabase'

export type ErrorKind = 'error' | 'unhandledrejection' | 'render'

declare const __APP_VERSION__: string

/** Au plus 10 envois par visite, et une seule fois le même message. */
const MAX_PER_SESSION = 10
let sent = 0
const seen = new Set<string>()

/** En production, ou quand la suite de tests le demande (VITE_ERROR_REPORTING=on). */
const enabled = () => import.meta.env.PROD || import.meta.env.VITE_ERROR_REPORTING === 'on'

/** « /join/3f9c…e1 » → « /join/:id » : jetons et identifiants ne quittent pas l'appareil. */
export function scrubPath(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(seg) || /^[A-Za-z0-9_-]{16,}$/.test(seg) || /^\d{4,}$/.test(seg) ? ':id' : seg))
    .join('/')
    .slice(0, 200)
}

/** Bruit qui ne vient pas de l'app : extensions, scripts tiers masqués, alertes connues du navigateur. */
export function isNoise(message: string, stack = ''): boolean {
  if (!message.trim()) return true
  // « Script error. » : erreur d'un script d'une autre origine, détails masqués par le navigateur.
  if (/^Script error\.?$/i.test(message.trim())) return true
  return /ResizeObserver loop|chrome-extension:|moz-extension:|safari-(web-)?extension:/i.test(`${message}\n${stack}`)
}

export function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: `${error.name !== 'Error' ? `${error.name}: ` : ''}${error.message}`, stack: error.stack }
  if (typeof error === 'string') return { message: error }
  try {
    return { message: JSON.stringify(error) ?? String(error) }
  } catch {
    return { message: String(error) }
  }
}

export function reportError(kind: ErrorKind, error: unknown, extraStack?: string): void {
  if (!enabled()) return
  const { message, stack } = describe(error)
  const fullStack = [stack, extraStack].filter(Boolean).join('\n--\n') || undefined
  if (isNoise(message, fullStack)) return
  const key = `${kind}|${message}`
  if (seen.has(key) || sent >= MAX_PER_SESSION) return
  seen.add(key)
  sent += 1
  // Sans attendre et sans jamais relancer : le suivi ne doit pas devenir une source d'erreurs.
  void supabase
    .rpc('log_client_error', {
      p_kind: kind,
      p_message: message.slice(0, 500),
      p_stack: fullStack?.slice(0, 4000),
      p_path: scrubPath(window.location.pathname),
      p_app_version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
      p_user_agent: navigator.userAgent.slice(0, 200)
    })
    .then(() => undefined, () => undefined)
}

/** Une seule fois, au démarrage (main.tsx). */
export function initErrorReporting(): void {
  window.addEventListener('error', (e) => reportError('error', e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => reportError('unhandledrejection', e.reason))
}

/** Pour les tests unitaires seulement. */
export function resetErrorReporting(): void {
  sent = 0
  seen.clear()
}
