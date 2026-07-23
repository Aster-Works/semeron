# セキュリティヘッダと CSP

定義場所: `next.config.ts`（全パス共通、`headers()`）。2026-07-24 のセキュリティ監査で CSP を追加。

## ヘッダ一覧

| ヘッダ | 値 | 目的 |
|---|---|---|
| Content-Security-Policy | 下記 | XSS 時の被害拡大を抑える最後の層 |
| X-Frame-Options | DENY | クリックジャッキング（frame-ancestors と二重） |
| X-Content-Type-Options | nosniff | MIME スニッフィング防止 |
| Referrer-Policy | strict-origin-when-cross-origin | リファラ最小化 |
| Permissions-Policy | camera/microphone/geolocation/browsing-topics 無効 | 不要 API の遮断 |
| Strict-Transport-Security | 2年・includeSubDomains・preload | HTTPS 強制（本番のみ有効） |

## CSP の設計判断

- `script-src 'self' 'unsafe-inline'`（本番）
  Next.js App Router がハイドレーション/ストリーミング用のインライン `<script>` を出すため
  `'unsafe-inline'` が必要。外部オリジンの `<script src>` はブロックされ、`connect-src` 制限で
  攻撃者ドメインへのデータ持ち出しも防ぐ。**nonce + strict-dynamic 化は将来課題**。
- `'unsafe-eval'` は**開発モードのみ**（React の開発デバッグが eval を要求）。本番には含めない。
- `connect-src` は self + Supabase（*.supabase.co / *.supabase.in / wss）のみ。
  開発時のみローカル Supabase（127.0.0.1:* / localhost:*）を追加（NODE_ENV 分岐）。
- `frame-ancestors 'none'` / `object-src 'none'` / `base-uri 'self'` / `form-action 'self'`。
- `style-src 'unsafe-inline'` は Tailwind/next-font の実行時挿入のため許容（style からのコード実行はない）。

## 検証

```bash
# 開発（unsafe-eval と 127.0.0.1 が入る）
curl -sI http://localhost:3070/ja/login | grep -i content-security-policy
# 本番（unsafe-eval と 127.0.0.1 が無いこと）
curl -sI https://semeron-app.vercel.app/ja/login | grep -i content-security-policy
```

## 変更時の注意

- 外部サービス（アナリティクス等）を足すときは、`default-src 'self'` に阻まれる。
  必要オリジンだけを該当ディレクティブへ明示追加する（ワイルドカード全開放にしない）。
- `next.config.ts` の変更は dev サーバー再起動が必要（HMR では反映されない）。
