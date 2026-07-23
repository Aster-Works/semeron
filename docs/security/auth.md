# 認証設計・パスワードポリシー

## 現在の構成（2026-07 時点）

- **ID＋パスワード**（8文字以上・メール確認必須 `mailer_autoconfirm=false`）＋ **Google ログイン**。
- Google ボタンは GoTrue の公開 `/auth/v1/settings` を probe して `external.google=true` の時だけ
  表示（fail-closed）。`/auth/callback` は PKCE 交換＋ `safeNext` で open redirect 対策。
- 確認/リカバリーメールは **token_hash 方式**（許可リスト glob がクエリ文字列を跨げない問題の回避）・
  Resend SMTP（noreply@asterworks.org）・日本語テンプレート。
- ログイン/サインアップは Server Action 経由（`signInWithPassword` / `signUpWithPassword`）。
  ブラウザから GoTrue へ直接 POST しない構成のため、CSP の `connect-src` を狭く保てる。
- セッション: `@supabase/ssr` の cookie ベース。middleware（proxy.ts）は `getClaims()` の
  ローカル JWT 検証（毎リクエストの Auth API 往復なし）。

## パスワードポリシー

| 項目 | 状態 |
|---|---|
| 最小長 8 文字 | ✅ GoTrue 設定＋アプリ側メッセージ |
| メール確認必須 | ✅（2026-07-02 有効化） |
| リカバリーのクールダウン | ✅ GoTrue 既定（per-email 429） |
| **HIBP（漏洩パスワード保護）** | ❌ **Supabase Pro プラン限定のため Free では有効化不可**。Pro 化したら Dashboard → Auth → Passwords で「Prevent use of leaked passwords」を ON にする（コード変更不要） |
| MFA | 未実装（教会規模とリスクから当面見送り。管理者アカウントが増えたら再検討） |

## アカウント保護の既存装置

- 招待コード: 30日期限・失効/再生成（owner/pastor のみ）・監査ログ記録。
- 会員ライフサイクル: 休止/復帰・教会から外す・アカウント削除（本人）。
- 役割変更は owner/pastor のみ＋**最後の owner 保護**トリガー。

## 検証

```bash
# メール確認が必須のままか（本番 GoTrue 設定）
curl -s https://<project-ref>.supabase.co/auth/v1/settings | jq '.mailer_autoconfirm'  # false であること
npm run db:test   # membership_lifecycle.test.sql
```
