import type { NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 静的アセット・画像・PWA を除く全ルートでセッションを更新
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|samples/|.*\\.svg$).*)",
  ],
};
