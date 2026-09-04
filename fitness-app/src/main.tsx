import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { initTheme, readStoredTheme } from './lib/theme'

initTheme(readStoredTheme())

if (import.meta.env.PROD) {
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
    <App />
  </React.StrictMode>
)