/* Semeron — service worker (Phase 4)
 *
 * 目的（03 §8）: 完全オフライン対応は目指さない。
 *  - app shell を軽くキャッシュ
 *  - 一度開いた「今日」ページをネット不通時に読める程度
 *  - Web Push（push / notificationclick）に対応
 */
const CACHE = "semeron-v1";
const APP_SHELL = ["/", "/ja", "/en", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ナビゲーションは network-first（最新のみことばを優先し、不通時のみキャッシュ）
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // 静的アセットは stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
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
    data: { url: payload.url || "/" },
    // 静かなリマインダー: 通知同士を積み上げず、そっと1つにまとめる
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
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
