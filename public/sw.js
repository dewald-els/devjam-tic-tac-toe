// Minimal offline-capable service worker: the app shell loads without a network,
// while game traffic (websockets) always goes straight to the server.
const CACHE = "ttt-v1"
const SHELL = ["/", "/favicon.svg", "/icon-192.png", "/icon-512.png"]

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/socket.io")) return

  // Pages: network first so a new deploy shows up immediately, cache when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put("/", copy))
          return res
        })
        .catch(() => caches.match("/"))
    )
    return
  }

  // Assets (hashed filenames, icons): cache first, fill on miss.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
    )
  )
})
