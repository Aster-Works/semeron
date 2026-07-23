import type { NextConfig } from "next";

// 全パス共通のセキュリティヘッダ（Aster Works 規約に準拠）。
// Aster Daily は祈祷課題など要配慮情報を扱うため、フレーム埋め込み禁止・
// リファラ最小化を初期から入れておく。
// Content-Security-Policy。XSS が起きた場合の被害拡大を抑える最後の層。
// Semeron は外部スクリプト・埋め込み・インライン<script>を使わない（Next.js の
// ハイドレーションは 'self' チャンクのみ）。Supabase(API/Auth) と Web Push の
// エンドポイントだけを connect-src で許可する。style は Tailwind の実行時挿入
// (next/font 等) のため 'unsafe-inline' を許容（style からのコード実行はない）。
// img は data:（アバターのSVG等）と blob: を許可。frame-ancestors 'none' で
// クリックジャッキングを二重に禁止（X-Frame-Options と併用）。
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next.js App Router はハイドレーション/ストリーミング用のインライン<script>を出すため
  // 'unsafe-inline' が必要。外部オリジンの <script src> は依然ブロックされ、connect-src
  // 制限で攻撃者ドメインへのデータ持ち出しも防ぐ。nonce+strict-dynamic 化は将来課題。
  // 'unsafe-eval' は React の開発モード（コールスタック再構築）専用。本番には含めない。
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // 開発時はローカル Supabase（127.0.0.1:54621 等）への接続も許可する。本番は hosted のみ。
  process.env.NODE_ENV === "production"
    ? "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co"
    : "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:*",
  "worker-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: cspDirectives },
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
