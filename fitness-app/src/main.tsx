import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { initTheme, readStoredTheme } from './lib/theme'
import { isNativeApp, markPlatform } from './lib/platform'
import { initErrorReporting } from './lib/errorReporting'
import ErrorBoundary from './components/ui/ErrorBoundary'

initTheme(readStoredTheme())
markPlatform()
initErrorReporting()

// Dans l'app des boutiques, les fichiers sont déjà sur le téléphone : pas de
// service worker, qui servirait l'ancienne version après une mise à jour.
const native = isNativeApp()

if (import.meta.env.PROD && !native) {
  const updateSW = registerSW({
    onNeedRefresh() {
      updateSW(true)
    },
    onOfflineReady() {
      console.log('App prête en mode hors-ligne')
    }
  })
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary full>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

if (native) {
  void import('./lib/nativeShell').then((m) => m.initNativeShell())
}