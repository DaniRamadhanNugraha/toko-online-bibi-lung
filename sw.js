const CACHE_VERSION = "v3";
const CACHE_NAME = "bibi-lung-" + CACHE_VERSION;
const OFFLINE_URL = "./offline.html";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ================= INSTALL =================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        STATIC_ASSETS.map(asset =>
          fetch(asset).then(res => {
            if (res.ok) cache.put(asset, res);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ================= ACTIVATE =================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ================= FETCH =================
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // ❌ Skip non-GET
  if (req.method !== "GET") return;

  // ❌ Jangan cache Firebase & eksternal API
  if (
    url.origin !== location.origin ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("firebase")
  ) {
    return;
  }

  // 🌐 HTML → Network First
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ||
            (await caches.match(OFFLINE_URL))
          );
        })
    );
    return;
  }

  // 🎨 Asset → Stale While Revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req)
        .then(res => {
          caches.open(CACHE_NAME).then(cache =>
            cache.put(req, res.clone())
          );
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// ================= PUSH =================
self.addEventListener("push", event => {
  const data = event.data?.json() || {};

  self.registration.showNotification(
    data.title || "Pesanan Baru",
    {
      body: data.body || "Ada pesanan masuk",
      icon: "./icon-192.png",
      badge: "./icon-192.png"
    }
  );
});

// ================= MESSAGE =================
self.addEventListener("message", event => {
  if (event.data?.action === "skipWaiting") {
    self.skipWaiting();
  }
});
