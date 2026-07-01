import { NextResponse } from "next/server";
import { createServerSupabase } from "@/app/lib/supabase/server";

/** マジックリンク / OAuth のコールバック。code をセッションに交換する。 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/ja/login?error=auth`);
}
