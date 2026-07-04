import { NextResponse } from "next/server";
import { dispatchQueuedNotifications } from "@/app/lib/notifications/dispatch";

/**
 * 通知ディスパッチ cron エンドポイント（07 Phase 4）。
 *  - queued の in-app 通知を各受信者の購読デバイスへ Web Push 配信する。
 *  - CRON_SECRET による Bearer 認証で保護（Vercel Cron / 外部スケジューラから叩く）。
 *  - 未設定・購読なしでも 200 を返し、コアを絶対にブロックしない。
 *
 * Vercel では vercel.json の crons でこの GET を定期実行する。
 */
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 未設定なら誰も叩けない（安全側）
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await dispatchQueuedNotifications();
    const logPayload = {
      published: summary.published,
      processed: summary.processed,
      sent: summary.sent,
      skipped: summary.skipped,
      failed: summary.failed,
      pushConfigured: summary.pushConfigured,
    };
    if (summary.failed > 0) {
      console.warn("[notifications.dispatch] completed with failures", logPayload);
    } else {
      console.info("[notifications.dispatch] completed", logPayload);
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[notifications.dispatch] failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "dispatch_failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
