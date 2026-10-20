/**
 * Où tourne WODBUD : site web, ou app installée.
 *
 * App installée = ajoutée à l'écran d'accueil (PWA en mode standalone,
 * y compris iOS) ou, plus tard, l'app des boutiques (Capacitor). La landing
 * page n'existe que sur le site web : dans l'app, on va droit au compte.
 */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  if (capacitor?.isNativePlatform?.()) return true
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
