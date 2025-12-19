const CACHE_NAME = "bibi-lung-v1";
const STATIC_CACHE = [
  "./",
  "./index.html"
];

// ================= INSTALL =================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE))
  );
  self.skipWaiting();
});

// ================= ACTIVATE =================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ================= FETCH =================
self.addEventListener("fetch", event => {
  const req = event.request;

  // ⛔ Abaikan non-GET
  if (req.method !== "GET") return;

  // ⛔ Jangan cache Firebase & WhatsApp
  if (
    req.url.includes("firestore.googleapis.com") ||
    req.url.includes("firebaseauth") ||
    req.url.includes("googleapis.com") ||
    req.url.includes("wa.me")
  ) {
    return;
  }

  // 🌐 HTML & JS → Network First
  if (
    req.headers.get("accept")?.includes("text/html") ||
    req.url.endsWith(".js")
  ) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 🖼️ Asset lain → Cache First
  event.respondWith(
    caches.match(req).then(cacheRes => {
      return (
        cacheRes ||
        fetch(req).then(fetchRes => {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return fetchRes;
        })
      );
    })
  );
});
