// Adds the cross-origin isolation headers GitHub Pages can't send, so the page can
// use SharedArrayBuffer. The BASIC computer needs it to pass keys to running programs.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (new URL(req.url).origin !== self.location.origin) return
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return
  e.respondWith(
    fetch(req).then((res) => {
      if (res.status === 0) return res
      const headers = new Headers(res.headers)
      headers.set('Cross-Origin-Opener-Policy', 'same-origin')
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
    }),
  )
})
