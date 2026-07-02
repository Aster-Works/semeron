import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/app/lib/supabase/server";

/**
 * 認証コールバック。2系統を扱う:
 *  1) OAuth（Google）: ?code=... → exchangeCodeForSession
 *  2) メールリンク（パスワードリセット等）: ?token_hash=...&type=recovery → verifyOtp
 *     token_hash 方式はサーバー側で完結し、PKCE の code_verifier クッキーに依存しない
 *     （リセットを別デバイス/文脈で申請しても機能する。Supabase の SSR 推奨パターン）。
 * next はオープンリダイレクト防止のため「同一オリジンの相対パス」だけ許可する。
 */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // rt = 確認メールの {{ .RedirectTo }}（絶対URL）。同一オリジンのときだけ
  // パス+クエリを next として復元する（招待リンク経由の登録で文脈を保持）。
  let rawNext = searchParams.get("next");
  const rt = searchParams.get("rt");
  if (!rawNext && rt) {
    try {
      const u = new URL(rt);
      if (u.origin === origin) rawNext = `${u.pathname}${u.search}`;
    } catch {
      // 不正な rt は無視して既定へ
    }
  }
  const next = safeNext(rawNext);

  const supabase = await createServerSupabase();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // 失敗時は next のロケールを尊重してログインへ（en 以外は ja）
  const locale = next === "/en" || next.startsWith("/en/") ? "en" : "ja";
  return NextResponse.redirect(`${origin}/${locale}/login?error=auth`);
}
