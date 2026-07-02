import type { NextConfig } from "next";

// 全パス共通のセキュリティヘッダ（Aster Works 規約に準拠）。
// Aster Daily は祈祷課題など要配慮情報を扱うため、フレーム埋め込み禁止・
// リファラ最小化を初期から入れておく。
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // 本番(HTTPS)でのみ有効。ローカルHTTPでは無視される。
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // 開発時のオーバーレイ（ルート左下のバッジ）を消す。会員下部ナビと重ならないように。
  devIndicators: false,
  experimental: {
    // クライアント側ルーターキャッシュ: 30秒以内に再訪したタブはサーバー往復なしで
    // 即時表示（タブ切替の体感速度）。更新系は server action の revalidatePath /
    // router.refresh がキャッシュを無効化するため整合は保たれる。
    staleTimes: { dynamic: 30, static: 300 },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // PWA: Service Worker はルートスコープで配信する。
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
