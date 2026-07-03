"use client";

const PURGE_MESSAGE = { type: "SEMERON_PURGE_CACHES" } as const;

export async function purgePwaCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  const deletes: Array<Promise<unknown>> = [];
  if ("caches" in window) {
    deletes.push(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined),
    );
  }

  if ("serviceWorker" in navigator) {
    deletes.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.active?.postMessage(PURGE_MESSAGE);
            registration.waiting?.postMessage(PURGE_MESSAGE);
            registration.installing?.postMessage(PURGE_MESSAGE);
          }
          navigator.serviceWorker.controller?.postMessage(PURGE_MESSAGE);
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(deletes);
}
