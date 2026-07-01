import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * サービスロール（RLS バイパス）クライアント。**サーバー専用**。
 * 通常のアプリ処理では使わない。auth.users の管理・招待作成など、
 * RLS では表現しづらい管理操作に限定する（03 §4 の方針）。
 * import "server-only" によりクライアントバンドルへの混入を防ぐ。
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
