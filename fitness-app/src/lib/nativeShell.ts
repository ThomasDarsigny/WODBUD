import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { backAction } from './nativeBack'
import { initNativePush } from './nativePush'
import { inAppPath, openInApp } from './nativeLinks'

/**
 * Ce que l'app des boutiques ajoute autour de la page (Capacitor). Chargé
 * seulement dans l'app : le site n'en télécharge pas une ligne.
 */
export function initNativeShell(): void {
  // Retour d'Android : voir nativeBack.ts.
  void App.addListener('backButton', ({ canGoBack }) => {
    const action = backAction({
      path: window.location.pathname,
      overlay: Boolean((window.history.state as { wbOverlay?: unknown } | null)?.wbOverlay),
      canGoBack
    })
    if (action === 'back') window.history.back()
    else void App.minimizeApp()
  })

  // Icônes de la barre d'état et de la barre de navigation lisibles sur le
  // thème de l'app (qui peut différer de celui du téléphone) : claires sur
  // le thème sombre, foncées sur le clair.
  const root = document.documentElement
  const syncBars = () => {
    const light = root.getAttribute('data-theme') === 'clair'
    void SystemBars.setStyle({ style: light ? SystemBarsStyle.Light : SystemBarsStyle.Dark })
  }
  syncBars()
  new MutationObserver(syncBars).observe(root, { attributes: true, attributeFilter: ['data-theme'] })

  // Lien du site ouvert dans l'app (A3) : invitation, communauté, QR de
  // présence. Aussi au démarrage : Capacitor garde le lien jusqu'à ce qu'on
  // l'écoute.
  void App.addListener('appUrlOpen', ({ url }) => {
    const path = inAppPath(url)
    if (path) openInApp(path)
  })

  // Notifications Firebase (A4) : toucher mène à la page, reçues app ouverte
  // → bannière, jeton tenu à jour.
  initNativePush()

  // L'écran de démarrage reste jusqu'au premier rendu, au lieu d'un écran
  // vide le temps que React démarre (filet : il se retire seul après 3 s).
  // Deux images : la première peinture de React est alors à l'écran.
  requestAnimationFrame(() => requestAnimationFrame(() => { void SplashScreen.hide() }))
}
