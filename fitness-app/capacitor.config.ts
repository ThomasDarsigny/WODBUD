import type { CapacitorConfig } from '@capacitor/cli'

/**
 * App des boutiques (Capacitor) : la même app que le site, servie depuis le
 * téléphone. Mode d'emploi : docs/android.md.
 *
 * L'identifiant `com.wodbud.app` devient définitif dès la première
 * publication sur Google Play (il ne peut plus changer ensuite).
 */
const config: CapacitorConfig = {
  appId: 'com.wodbud.app',
  appName: 'WODBUD',
  webDir: 'dist',
  // Pas de `backgroundColor` : MainActivity donne au WebView le fond de
  // l'app, clair ou sombre comme le téléphone.
  // L'inspection depuis chrome://inspect reste réservée aux versions de
  // développement (défaut de Capacitor) : la version des boutiques la ferme.
  plugins: {
    SystemBars: {
      // Capacitor pose --safe-area-inset-* dans la page (voir index.css) ;
      // la page déclare viewport-fit=cover, ce qui évite un saut au démarrage.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover'
    },
    SplashScreen: {
      // Retiré au premier rendu (lib/nativeShell.ts) ; filet de 3 s.
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      showSpinner: false
    }
  }
}

export default config
