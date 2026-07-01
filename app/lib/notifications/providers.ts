import "server-only";
import webpush from "web-push";

/**
 * 通知プロバイダ抽象（07 Phase 4）。
 *
 * すべて env ゲート。鍵が未設定なら該当チャネルは「無効」を返すだけで、
 * 例外を投げない（コア体験を絶対にブロックしない — 03 §7）。
 */

// ── Web Push（VAPID）─────────────────────────────────────────────────────
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:notifications@aster.works";

let vapidReady = false;
function ensureVapid(): boolean {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
  }
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

export interface PushSubscriptionShape {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type PushResult =
  | { ok: true }
  | { ok: false; gone: boolean; reason: string };

/**
 * 単一の購読へ送信。410/404（購読失効）は gone=true を返し、
 * 呼び出し側が購読を掃除できるようにする。
 */
export async function sendWebPush(
  sub: PushSubscriptionShape,
  payload: { title: string; body?: string; url?: string; tag?: string },
): Promise<PushResult> {
  if (!ensureVapid()) return { ok: false, gone: false, reason: "push_not_configured" };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: "normal" },
    );
    return { ok: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const gone = statusCode === 404 || statusCode === 410;
    return { ok: false, gone, reason: `push_error_${statusCode ?? "unknown"}` };
  }
}

// ── Email（Resend REST — 追加依存なし）────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFICATIONS_FROM_EMAIL || "Semeron <noreply@aster.works>";

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export async function sendEmail(
  to: string,
  subject: string,
  opts: { text: string; html?: string },
): Promise<{ ok: boolean; reason?: string }> {
  if (!RESEND_API_KEY) return { ok: false, reason: "email_not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
      }),
    });
    if (!res.ok) return { ok: false, reason: `email_http_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: "email_network_error" };
  }
}
