/* Notifications push — chargé dans le service worker généré (vite.config.ts,
   workbox.importScripts). Le contenu vient de la fonction Edge `push`. */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'WODBUD', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      // Même tag = remplace la notification précédente au lieu d'empiler.
      tag: data.tag,
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      // Une fenêtre de l'app déjà ouverte est réutilisée plutôt que d'en
      // ouvrir une deuxième.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) return client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    })()
  )
})
