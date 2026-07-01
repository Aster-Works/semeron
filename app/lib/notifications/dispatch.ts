import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isPushConfigured, sendWebPush } from "./providers";

/**
 * 通知ディスパッチャ（07 Phase 4「Notification queue table integration」）。
 *
 * 設計: in-app 通知（トリガーが生成、status='queued'）を「唯一の真実」とし、
 * ここで各受信者の購読デバイスへ Web Push を配信する。重複行は作らない。
 *  - Inbox は status に関わらず in-app を表示するため、ここで status を
 *    sent/skipped/failed に更新しても受信箱の見え方は変わらない。
 *  - Push 未設定・購読なしは 'skipped'。全デバイス失敗は 'failed'。
 *  - 失効した購読（410/404）は push_subscriptions から削除する。
 *  - cron（/api/notifications/dispatch）から呼ぶ。冪等: 一度 queued を外せば再送しない。
 */

const BATCH = 100;

export interface DispatchSummary {
  published: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  pushConfigured: boolean;
}

/**
 * 予約公開（scheduled_at 到来）のコンテンツを published へ昇格する。
 * デボーションが published になると notify_on_devotion_publish トリガーが
 * 会員全員へ in-app 通知を作る（＝「Daily devotion notification job」の実体）。
 * システム cron なのでサービスロールで実行（RLS バイパスは意図的）。
 */
export async function publishDueContent(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content_items")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .select("id");
  if (error) throw new Error(`publishDueContent failed: ${error.message}`);
  return data?.length ?? 0;
}

export async function dispatchQueuedNotifications(): Promise<DispatchSummary> {
  const admin = createAdminClient();
  const pushOn = isPushConfigured();

  // 1) 予約公開の到来分を publish（トリガーが in-app 通知を生成）
  const published = await publishDueContent();

  // 2) queued の in-app 通知を購読デバイスへ配信
  const { data: queued, error } = await admin
    .from("notifications")
    .select("id, church_id, recipient_membership_id, type, title, body, data")
    .eq("channel", "in_app")
    .eq("status", "queued")
    .not("recipient_membership_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) throw new Error(`dispatch query failed: ${error.message}`);

  const summary: DispatchSummary = {
    published,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    pushConfigured: pushOn,
  };

  for (const n of queued ?? []) {
    summary.processed++;

    // Push 未設定なら送信対象なし → skipped（in-app は Inbox に残る）
    if (!pushOn) {
      await mark(admin, n.id, "skipped", "push_not_configured");
      summary.skipped++;
      continue;
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("membership_id", n.recipient_membership_id as string);

    if (!subs || subs.length === 0) {
      await mark(admin, n.id, "skipped", "no_subscription");
      summary.skipped++;
      continue;
    }

    const payload = {
      title: pickLocalized(n.title) || "Semeron",
      body: pickLocalized(n.body),
      url: notificationUrl(n),
      tag: n.type as string,
    };

    let anySent = false;
    for (const s of subs) {
      const res = await sendWebPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      if (res.ok) {
        anySent = true;
      } else if (res.gone) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }

    if (anySent) {
      await mark(admin, n.id, "sent", null);
      summary.sent++;
    } else {
      await mark(admin, n.id, "failed", "all_endpoints_failed");
      summary.failed++;
    }
  }

  return summary;
}

async function mark(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  status: "sent" | "skipped" | "failed",
  reason: string | null,
) {
  await admin
    .from("notifications")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      failure_reason: reason,
    })
    .eq("id", id);
}

/** jsonb の多言語タイトル/本文から代表値を1つ拾う（ja 優先→en→最初）。 */
function pickLocalized(v: unknown): string | undefined {
  if (!v || typeof v !== "object") return undefined;
  const m = v as Record<string, string | undefined>;
  return m.ja ?? m.en ?? Object.values(m).find((x) => typeof x === "string" && x.length > 0);
}

function notificationUrl(n: { data?: unknown }): string {
  const data = (n.data ?? {}) as Record<string, unknown>;
  const contentId = data.content_item_id;
  // クリック時の遷移先はクライアント側 SW が決める。相対パスの手掛かりだけ渡す。
  return typeof contentId === "string" ? `/?n=${contentId}` : "/";
}
