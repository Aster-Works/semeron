import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * サーバー用 Supabase クライアント（Cookie ベースのセッション）。
 * Server Component / Server Action / Route Handler で使う。RLS が効く。
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component からの set はミドルウェアが更新するため無視してよい。
          }
        },
      },
    },
  );
}
