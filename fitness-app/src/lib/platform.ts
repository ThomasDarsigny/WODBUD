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

/**
 * Android : le flou en temps réel coûte cher sur les téléphones d'entrée de
 * gamme, et le verre n'appartient pas au langage visuel d'Android. On marque
 * <html> pour que les barres y restent opaques. L'agent utilisateur contient
 * « Android » dans Chrome comme dans l'app emballée (WebView).
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
  return data?.platform === 'Android' || /Android/i.test(navigator.userAgent)
}

export function markPlatform(): void {
  if (isAndroid()) document.documentElement.classList.add('is-android')
}
