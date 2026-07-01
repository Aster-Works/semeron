"use client";

import { useEffect } from "react";

/**
 * Service Worker 登録。
 * - 本番のみ登録（dev では古いキャッシュで混乱しないよう解除する）。
 * - 失敗してもアプリは止めない（04/07 の方針: 通知/PWAでコア機能を阻害しない）。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* PWA は任意機能。失敗しても無視する。 */
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  }, []);

  return null;
}
