# RLSポリシー台帳・権限モデル

方針: **fail-closed**。全15表で RLS 有効・ポリシーは `authenticated` ロールのみ。
`anon` には表・ビュー・definer 関数のいずれも権限を付与しない（未認証は全拒否）。

## 権限モデル

| ロール | できること |
|---|---|
| `anon` | 何も読めない・書けない・実行できない（GoTrue の auth エンドポイントのみ） |
| `authenticated` | RLS の範囲内で読み書き。`content_items.author_membership_id` は**列レベルで revoke**（匿名保護） |
| `service_role` | RLS バイパス。サーバー専用（cron dispatch・管理運用 RPC・監査）。ブラウザに出さない |

## 表ごとの要点（全表 RLS 有効・2026-07-24 時点）

| 表 | SELECT | 書き込みの要点 |
|---|---|---|
| churches | 所属会員 | UPDATE は owner/pastor のみ |
| memberships | 同一教会の会員 | 退会/休止はライフサイクル RPC・トリガーで保護 |
| membership_roles | 同一教会 | owner/pastor のみ変更。**最後の owner 保護**トリガー |
| content_items | `private.can_view_content`（公開範囲・状態・期限を一元判定） | 一般会員は draft/pending_review まで。published 遷移は can_moderate（reflection のみ即時公開の carve-out） |
| prayer_logs | **本人のみ** | INSERT は本人＋ `can_view_content` を要求（見えない課題には祈れない） |
| completion_logs | 本人のみ | 本人のみ |
| reactions | 同一教会 | 本人の行のみ |
| notifications | **受信者本人のみ**（admin carve-out なし＝匿名の逆引き封じ） | 既読等は本人のみ |
| groups / group_memberships | 所属者または管理者 | 管理者。空でないグループは削除拒否トリガー |
| moderation_reviews / audit_logs | 管理者 | 追記のみ |
| consent_records / profiles / push_subscriptions | 本人 | 本人 |

## definer 関数と実行権

`private.*` ヘルパー（is_active_member / has_church_role / is_church_admin / can_moderate /
can_view_content / feed_author / my_membership_id）は SECURITY DEFINER。
public 側の RPC（create_church / join_church / owns_content / update_my_display_name /
weekly_summary / mark_prayer_answered / devotion_completion_counts / church_notification_ops）は
**anon から EXECUTE を revoke 済み**。新規 RPC を足すときは必ず同じ revoke を migration に含める。

## content_feed ビュー

- `security_invoker=true`（基底表の RLS がそのまま効く）＋ 匿名マスク（作者は `private.feed_author` 経由）。
- migration `20260709090000` で anon/PUBLIC の全権限を剥がし、authenticated に SELECT のみ付与。

## 検証

```bash
npm run db:test   # security_hardening.test.sql が anon 全拒否を回帰テスト
# ポリシー実体の一覧:
docker exec <db-container> psql -U postgres -Atc \
  "select tablename, policyname, cmd, roles from pg_policies where schemaname='public' order by 1,2;"
supabase db advisors --linked --level error --fail-on error
```
