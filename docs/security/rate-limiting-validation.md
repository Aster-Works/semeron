# レート制限と入力検証

目的: Bot・スクリプト・悪意ある会員による大量投稿/巨大ペイロードから、DB 肥大・通知爆発・
Egress 増大・モデレーション麻痺を防ぐ。**クライアント側の検証は UX 用であり、信用しない。**

実装場所: `app/lib/db/action-helpers.ts`（共通）＋ `app/lib/db/actions.ts`（各 Server Action）。

## レート制限

- `tooManyRecentPosts(supabase, churchId, membershipId)`:
  **直近60秒に本人が作成したコンテンツが12件以上なら拒否**（`RATE_WINDOW_MS` / `RATE_MAX_POSTS`）。
- 判定は `content_feed` の COUNT（`church_id + author_membership_id + created_at`）。
  DB ベースなのでサーバーレス（Vercel の複数インスタンス）でも一貫する。外部ストア不要。
- content_feed 経由のため「本人には本人の author id が見える」= 匿名マスクを壊さない。
- 適用先: `submitPrayerRequest` / `postReflection`（新規作成系）。
- 正常な利用（1日数件）には絶対に当たらない閾値。当たったら
  `RATE_LIMITED_MESSAGE`（日本語の案内文）を返す。

## 入力検証（サーバー側）

| 定数 | 値 | 適用 |
|---|---|---|
| `MAX_TITLE_LEN` | 200字 | submitPrayerRequest / updatePrayerRequest |
| `MAX_BODY_LEN` | 8000字 | 上記＋ postReflection / updateReflection |

- trim 後に空なら `"empty"`、超過なら `"too_long"` を返す（保存しない）。
- 公開範囲 `group` は `group_memberships` の所属確認をサーバーで行う（偽の groupId を拒否）。
- 日付は `normalizeDateKey`（YYYY-MM-DD の形式検証）を通す。

## 既知の限界と将来課題

- 60秒窓の単純カウント。分散攻撃（多数アカウント）には効かない
  → その場合は Vercel Firewall / Supabase Auth のサインアップ制限で対処（incident-response.md）。
- 読み取り系のレート制限は未実装（RLS と LIMIT で被害が小さいため見送り）。

## 検証

```bash
npm test   # vitest（action 検証のユニットテスト）
# 手動: 同一ユーザーで60秒に13件投稿すると13件目が案内文で拒否される
```
