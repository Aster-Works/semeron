import { NextResponse } from "next/server";
import { createServerSupabase } from "@/app/lib/supabase/server";

/**
 * OAuth（Google など）のコールバック。code をセッションに交換する。
 * next はオープンリダイレクト防止のため「同一オリジンの相対パス」だけ許可する
 * （"//evil.com" や "/\evil.com" は拒否して "/" に落とす）。
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
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  // 失敗時は next のロケールを尊重してログインへ（en 以外は ja）
  const locale = next === "/en" || next.startsWith("/en/") ? "en" : "ja";
  return NextResponse.redirect(`${origin}/${locale}/login?error=auth`);
}
