/*
 * Only public, same-origin files are cached here. Supabase uses a different
 * origin and is intentionally left to the browser network stack, so sessions,
 * searches, recharges, wallet data and admin data are never cached by Lewad.
 */
const STATIC_CACHE = 'lewad-static-v3'
const APP_SHELL = '/'
const MANIFEST_PATH = '/manifest.webmanifest?v=launch-20260830-3'
const LEWAD_ICON_PATH = '/assets/logo_lewad.png?v=launch-20260830-3'
const APP_SHELL_FILES = [
  APP_SHELL,
  '/index.html',
  MANIFEST_PATH,
  LEWAD_ICON_PATH,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith('lewad-static-') && name !== STATIC_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

function isPublicStaticAsset(url) {
  return url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')
}

function canCache(response) {
  return response.ok && response.type === 'basic'
}

function networkFirstNavigation(request) {
  return caches.open(STATIC_CACHE).then(async (cache) => {
    try {
      const response = await fetch(request)

      // The public shell is the only navigation response persisted by the worker.
      if (canCache(response) && new URL(request.url).pathname === APP_SHELL) {
        await cache.put(APP_SHELL, response.clone())
      }

      return response
    } catch {
      return (await cache.match(request)) || (await cache.match(APP_SHELL)) || Response.error()
    }
  })
}

function staleWhileRevalidate(request, event) {
  const cachePromise = caches.open(STATIC_CACHE)
  const update = cachePromise.then(async (cache) => {
    const response = await fetch(request)
    if (canCache(response)) await cache.put(request, response.clone())
    return response
  })

  event.waitUntil(update.catch(() => undefined))

  return cachePromise.then(async (cache) => (await cache.match(request)) || update)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // This also excludes Supabase and every other third-party origin.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isPublicStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, event))
  }
})
