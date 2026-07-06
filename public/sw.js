/* Semeron — service worker (Phase 4)
 *
 * Privacy-first PWA policy:
 *  - HTML navigations and authenticated pages are never cached.
 *  - Only app manifest/icon assets are cached.
 *  - Next.js build chunks are not cached here; Vercel/browser immutable caching
 *    handles them more safely across deploys.
 *  - Sign-out / church leave / account deletion can explicitly purge caches.
 */
const STATIC_CACHE = "semeron-static-v3";
const PRECACHE_URLS = ["/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-maskable.svg"];
const STATIC_PREFIXES = ["/icons/"];

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname === "/manifest.webmanifest" ||
      STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)))
  );
}

function purgeCaches() {
  return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
}

function safeTargetPath(value) {
  if (typeof value !== "string" || value.length === 0) return "/";
  try {
    const target = new URL(value, self.location.origin);
    if (target.origin !== self.location.origin) return "/";
    const path = `${target.pathname}${target.search}${target.hash}`;
    if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
    return path;
  } catch {
    return "/";
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SEMERON_PURGE_CACHES") {
    event.waitUntil(purgeCaches());
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!isStaticAsset(url)) return;

  // Manifest/icons のみ stale-while-revalidate。HTML/API/RSC/Next chunks は保存しない。
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) => cache.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })),
  );
});

/* ── Web Push（Phase 4）─────────────────────────────────────────────────
 * ディスパッチャ（/api/notifications/dispatch）が JSON ペイロードを送る。
 * 静かな牧会的トーン: バイブや派手な演出はせず、静かに届ける。
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Semeron", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Semeron";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "semeron",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: { url: safeTargetPath(payload.url) },
    // 静かなリマインダー: 通知同士を積み上げず、そっと1つにまとめる
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeTargetPath(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // 既に開いているタブがあればそれをフォーカス
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && target !== "/") client.navigate(target).catch(() => undefined);
          return undefined;
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    }),
  );
});
