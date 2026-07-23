# 匿名の不変条件（★この文書に反する変更を入れない）

パイロットで「匿名で投稿した祈祷課題が匿名になっていない」事故が起き、2026-07-03 に**完全匿名**へ
堅牢化した（migration `20260703120000` / commit 366ab94）。Jimi の決定: 匿名投稿の作者は
**牧師・役員・祈祷チームにも画面に出さない**。DB は帰属を保持し、監査対応は service_role のみ。

## 3層の不変条件

1. **`anonymous` フラグ一本が真実（sticky）**
   トリガー `private.enforce_prayer_anonymity`: `anonymous_church` を希望/公開範囲に持てば
   `anonymous=true` を強制し、true→false への降格を禁止。reflection は常に匿名。
   モデレーションで公開範囲が変わっても匿名は剥がれない。
2. **作者列は列レベル revoke**
   `content_items.author_membership_id` は authenticated から SELECT 不可（`select *` も不可）。
   作者の露出は `private.feed_author(id)`（definer・完全匿名判定）経由の `content_feed` のみ。
   所有権判定は `public.owns_content(id)` RPC。アプリコードで作者列を直接 select/filter しない。
3. **通知の逆引き封じ**
   `notifications_select` は受信者本人のみ（admin carve-out なし）。管理運用画面は
   `public.church_notification_ops()`（redacted RPC）経由で、受信者と内容の連結を返さない。

## 派生ルール

- 通報（確認依頼）の依頼者/対応者 membership id は、会員可読の `content_items.metadata` に
  書かない。身元の記録は audit_logs（管理者のみ）だけ（migration `20260708090000`）。
- 通知の `data` に `author_membership_id` を入れない。
- 週次集計（weekly_summary）等の管理向け RPC は匿名集計のみ返す。

## 禁止される変更（レビューで必ず弾く）

- `content_items.author_membership_id` の authenticated への再 GRANT
- `notifications_select` への管理者例外の追加
- `insert().select()` パターンで作者列を返すコード（RLS エラーになる。id は `randomUUID()` で事前生成）
- anonymous の二重エンコード（フラグ以外の場所に匿名状態を持たせる）

## 検証

```bash
npm run db:test   # rls_anonymity.test.sql（13件）が全層を回帰テスト
```
