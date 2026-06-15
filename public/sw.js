// GanpatiBappa Service Worker v2.0
// Handles: offline caching, push notifications, background sync

const CACHE_NAME = 'ganpatibappa-v2'
const STATIC_CACHE = 'static-v2'
const OFFLINE_PAGE = '/offline.html'

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  OFFLINE_PAGE,
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// ── Install ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and API requests
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return

  // Product pages: cache-first for images, network-first for HTML
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        try {
          const response = await fetch(request)
          if (response.ok) cache.put(request, response.clone())
          return response
        } catch {
          return cached ?? new Response('', { status: 408 })
        }
      })
    )
    return
  }

  // HTML pages: network-first with offline fallback
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached ?? caches.match(OFFLINE_PAGE)
        })
    )
    return
  }
})

// ── Push Notifications ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'GanpatiBappa', body: event.data.text() }
  }

  const { title = 'GanpatiBappa', body = '', url = '/', icon, badge } = data

  const options = {
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: { url },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification Click ──────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes(url) && 'focus' in c)
        if (existing) return existing.focus()
        return clients.openWindow(url)
      })
  )
})

// ── Background Sync (Order queue) ─────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders())
  }
})

async function syncPendingOrders() {
  // This would sync orders stored in IndexedDB when offline
  // Implementation in the client app via idb-keyval or similar
  console.log('[SW] Syncing pending orders...')
}
