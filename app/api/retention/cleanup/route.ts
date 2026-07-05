import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * 保持期間ポリシーの自動クリーンアップ。
 * Vercel Cron から CRON_SECRET Bearer 付きで日次実行する。
 */
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("run_retention_cleanup");
    if (error) {
      console.error("[retention.cleanup] failed", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    console.info("[retention.cleanup] completed", data);
    return NextResponse.json({ ok: true, summary: data });
  } catch (err) {
    console.error("[retention.cleanup] failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "cleanup_failed" },
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
