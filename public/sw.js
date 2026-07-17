// Bump CACHE to force old caches to be dropped on the next activate.
const CACHE = 'finance-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // never cache the sync API — it must always hit the network
  if (url.pathname.startsWith('/api/')) return

  // navigations: network-first so updates land, cached shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put('/index.html', fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(CACHE)
          const cached = await cache.match('/index.html')
          return cached || Response.error()
        }
      })()
    )
    return
  }

  // static assets: cache-first, populate on first fetch
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      try {
        const fresh = await fetch(request)
        if (fresh.ok) {
          const cache = await caches.open(CACHE)
          cache.put(request, fresh.clone())
        }
        return fresh
      } catch {
        return cached || Response.error()
      }
    })()
  )
})
