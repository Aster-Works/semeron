"use client";

/**
 * ブラウザ側の Web Push 購読ヘルパー（Phase 4）。
 *  - iOS はホーム画面追加 + iOS16.4+ が必要。未対応端末では graceful に false を返す。
 *  - VAPID public key（NEXT_PUBLIC_）で購読し、endpoint/keys をサーバーへ保存する。
 */

export type PushSupport =
  | { supported: true; permission: NotificationPermission }
  | { supported: false; reason: "no_sw" | "no_push" | "no_notification" };

export function checkPushSupport(): PushSupport {
  if (typeof window === "undefined") return { supported: false, reason: "no_sw" };
  if (!("serviceWorker" in navigator)) return { supported: false, reason: "no_sw" };
  if (!("PushManager" in window)) return { supported: false, reason: "no_push" };
  if (!("Notification" in window)) return { supported: false, reason: "no_notification" };
  return { supported: true, permission: Notification.permission };
}

/** iOS Safari はスタンドアロン（ホーム画面から起動）でないと Push 不可。 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ は Mac を騙るのでタッチで判定
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export interface BrowserSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}

function encodeKey(key: ArrayBuffer | null): string {
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

/** SW を登録し、Push を購読して {endpoint,p256dh,auth} を返す。失敗時 null。 */
export async function subscribeToPush(vapidPublicKey: string): Promise<BrowserSubscription | null> {
  const support = checkPushSupport();
  if (!support.supported) return null;
  if (!vapidPublicKey) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? encodeKey(sub.getKey("p256dh")),
    auth: json.keys?.auth ?? encodeKey(sub.getKey("auth")),
    userAgent: navigator.userAgent,
  };
}

/** 現在の端末の購読を解除し、endpoint を返す（サーバー削除用）。 */
export async function unsubscribeFromPush(): Promise<string | null> {
  const support = checkPushSupport();
  if (!support.supported) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

export async function currentSubscriptionEndpoint(): Promise<string | null> {
  const support = checkPushSupport();
  if (!support.supported) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}
