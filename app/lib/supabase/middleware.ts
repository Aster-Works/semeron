import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * セッション更新ミドルウェア。各リクエストで Supabase セッションを refresh し、
 * Cookie を最新化する（@supabase/ssr の推奨パターン）。
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims は JWT をローカル署名検証する（JWKS はインスタンス内キャッシュ）。
  // 毎リクエストの Auth サーバー往復を排除してナビゲーションを高速化。
  // 検証できない/期限切れのときだけ getUser でネットワーク検証+トークン
  // リフレッシュ（Cookie 更新）を行う。
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    await supabase.auth.getUser();
  }

  return response;
}
