# HANDOFF — Semeron Today「今日の祈り」実装

対象リポ: /Users/james/syncthing/semeron
セッション開始: 2026-07-04 00:33 JST / 担当: Codex

## 現在のチェックポイント — Today応答のデボーション紐づけ + リアクション整理（2026-07-06）

### 今回の依頼
- Todayに表示する応答は、その日のデボーションに対する応答だけにする。
- 応答には「祈りました」ボタンを出さない。
- 「祈り」には「アーメン」と「感謝」ボタンを出さない。

### 確認済み
- 既存の `getReflections` は教会全体の最新 `reflection` を取得しており、現在表示中のデボーションIDで絞っていない。
- `postReflection` は `content_items.metadata` にデボーションIDを保存していない。
- 前回のリアクション追加で、応答にも祈祷課題にも `prayed/amen/thanks` が表示される状態になっている。

### 方針
- 新しいDB列は追加せず、既存 `content_items.metadata.devotion_content_id` に投稿元デボーションIDを保存する。
- Todayでは現在の `devotion.id` に一致する応答だけを取得する。
- 応答の表示リアクションは `amen/thanks` のみにする。
- 祈祷課題の表示リアクションは `prayed` のみに戻す。

### 実装済み
- `postReflection` が投稿元の公開デボーションを確認し、`metadata.devotion_content_id` / `metadata.devotion_date` を保存するよう変更。
- `ReflectionComposer` / `TodayDevotionFlow` が現在の `devotion.id` を渡すよう変更。
- Todayページの `getReflections` 呼び出しを、現在のデボーションIDで絞り込むよう変更。
- `getReflections` は `metadata->>devotion_content_id` でフィルタ可能になり、応答リアクションは `amen/thanks` のみ取得。
- 祈祷課題リアクションは `prayed` のみ取得・表示。
- `tests/unit/reaction-scope.test.tsx` を追加し、応答/祈りの表示リアクション種別を固定。

### 検証状況
- Supabase changelog確認: 今回の既存 `metadata` 利用・Data APIフィルタに直接影響するbreaking changeなし。
- `npm run typecheck` PASS。
- `npm test` PASS（17 files / 69 tests）。
- `npm run lint` PASS。
- `npm run build` PASS。
- ローカルDBで `metadata->>'devotion_content_id'` の一致検索が1件になることを一時行で確認し、削除済み。
- `supabase db advisors --local --level error --fail-on error` PASS（No issues found）。
- `git diff --check` PASS。
- `npm run db:test` PASS（6 files / 117 tests）。

### リリース状況
- 修正コミット: `6a74a5d Scope Today reflections to devotion`。
- `git push origin main` PASS。`origin/main` は `ce4c073..6a74a5d` へ更新。
- DB schema migrationは不要（既存 `content_items.metadata` 利用のみ）。
- GitHub連携Vercel Production deployment成功。
  - commit `6a74a5d` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - Vercel status target: `https://vercel.com/asterworks/semeron/CgZicdRRb8fBrykYcW5X2QvX4iae`。
- `curl -I -L https://semeron-app.vercel.app/ja/login` で production が `HTTP/2 200` / `server: Vercel` を返すことを確認。

## 現在のチェックポイント — 保持期間・通知整理・リアクション・検索・レビュー依頼（2026-07-06）

### 今回の依頼
- 保持期間ポリシー、通知センターの整理、「祈っています/アーメン/感謝」のリアクション、投稿検索、「ミュート、管理者レビュー依頼」、自動クリーンアップ＋設定画面を実装する。
- Tokenリミットに気をつけ、必ずDeployまで完了する。

### 初期確認
- 既存DBには `content_items` / `reactions` / `notifications` / `audit_logs` があり、`reactions.type` は既に `amen` / `prayed` / `thanks` / `read` を許可している。
- `churches` には朝の通知時間などの設定編集が前回実装済みだが、保持期間ポリシーは未実装。
- 通知は既存 `notifications` テーブルに集約されているが、カテゴリ・非表示/ミュート・保持期間クリーンアップの列は未実装。
- 祈祷課題一覧は検索UIなし。祈祷課題カードは主に「祈っています」のみ表示。

### 方針
- 新テーブルを増やしすぎず、既存 `churches.retention_policy` と `notifications` 拡張で安全に実装する。
- 自動クリーンアップはSupabase関数 + Vercel Cron routeで日次実行にする。
- 管理者レビュー依頼は既存 `content_items.metadata` と管理者向け通知を使って、投稿に対する安全な通報/確認依頼として実装する。
- UIは管理者設定、通知センター、祈祷課題一覧/カードに限定して変更する。

### 進行中
- DBマイグレーションを追加済み。
  - `churches.retention_policy` を追加。
  - `notifications.category` / `archived_at` / `muted_by_recipient` を追加。
  - `public.run_retention_cleanup(target_church uuid default null)` を追加。
  - 通知トリガにカテゴリを付与。
- Server Actionsを追加/拡張済み。
  - `updateChurchSettings` が保持期間ポリシーを保存可能。
  - `muteNotification`、`requestAdminReview`、`runRetentionCleanupNow` を追加。
- UIを追加/更新済み。
  - 設定画面に `RetentionPolicyEditor` を追加。
  - 通知センターにカテゴリ絞り込みと非表示操作を追加。
  - 祈祷課題一覧に検索フォームを追加。
  - 祈祷課題カードに「祈っています / アーメン / 感謝」と管理者確認依頼を追加。
- Vercel Cron に `/api/retention/cleanup` を追加済み。

### 次に行うこと
- なし。

### 検証状況
- `npm run db:reset` PASS。新migration `20260705180903_retention_notification_controls.sql` 適用済み。
- `npm run db:types` PASS。`app/lib/database.types.ts` 再生成済み。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm test` PASS（16 files / 67 tests）。
- `npm run db:test` PASS（6 files / 117 tests）。
- `npm run build` PASS。
- `supabase db advisors --local --level error --fail-on error` PASS（No issues found）。
- `git diff --check` PASS。

### リリース状況
- 修正コミット: `3320ad8 Add retention cleanup and safer social controls`。
- `git push origin main` PASS。`origin/main` は `5755c60..3320ad8` へ更新。
- remote Supabase migration適用済み。
  - `supabase db push --yes` は `20260705180903_retention_notification_controls.sql` を適用し `Finished supabase db push.` で完了。
  - pg-delta catalog cache 警告は出たが、`supabase_migrations.schema_migrations` で `20260705180903` が `applied=1` であることを確認。
  - `supabase db advisors --linked --level error --fail-on error` PASS（No issues found）。
- GitHub連携Vercel Production deployment成功。
  - commit `3320ad8` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - Vercel status target: `https://vercel.com/asterworks/semeron/7fw9CQQFNVARzU1hfSQvTREAsQSw`。
- `curl -I -L https://semeron-app.vercel.app/ja/login` で production が `HTTP/2 200` / `server: Vercel` を返すことを確認。

## 現在のチェックポイント — 教会設定の基本項目編集（2026-07-05 23:26 JST）

### 今回の依頼
- 小グループ削除作業が終わったら、追加で「教会の設定」の設定も変更できるようにする。
- 特に朝の通知時間を変更したい。

### 確認済みの事実
- `/admin/{churchSlug}/settings` の基本情報カードは、教会名・既定言語・タイムゾーン・朝の通知時刻・プランが readOnly / disabled で表示のみ。
- `churches.morning_notification_time` は既にDBにあり、デボーションの予約公開時刻計算で `getChurchTiming` / `scheduleDateToIso` 経由で参照されている。
- `churches_update` RLS は owner/pastor 限定。既存の Pastor Assist / 配信言語 / 役割表示名も owner/pastor に編集を絞っている。

### 方針
- 基本情報カードを owner/pastor が保存できるフォームにする。
- まず実用上必要な項目として、朝の通知時刻・タイムゾーン・ソフトゲート・教会名を保存可能にする。
- 既定言語とプランは影響範囲/契約要素が大きいため引き続き表示のみ。
- Server Action 側で時刻・タイムゾーン・soft gate・教会名を検証してから保存する。

### 実装済み
- `app/lib/db/actions.ts`
  - `updateChurchSettings` を拡張し、教会名・タイムゾーン・朝の通知時刻・ソフトゲートも保存可能にした。
  - 実行者を active member かつ owner/pastor に限定。
  - `morningNotificationTime` は `HH:MM` / `HH:MM:SS` のみ受け付け、DBには `HH:MM:00` で保存。
  - `timezone` は `Intl.DateTimeFormat` で妥当性確認。
  - 保存時に `audit_logs` へ `church.settings_updated` を記録。
- `app/components/admin/ChurchBasicsEditor.tsx` を追加。
  - 教会名、タイムゾーン、朝の通知時刻、ソフトゲートを編集可能。
  - 既定言語とプランは表示のみ。
- `app/[locale]/admin/[churchSlug]/settings/page.tsx`
  - 基本情報カードを `ChurchBasicsEditor` に差し替え。
  - ソフトゲートの表示専用カードは基本設定内へ統合。
- `app/lib/db/map.ts`
  - `morningNotificationTime` を `HH:MM` 表示に正規化。
- `app/lib/i18n/messages.ts`
  - 基本設定編集用の日英文言を追加。
- `tests/unit/church-basics-editor.test.tsx`
  - 朝の通知時刻を変更して保存できること。
  - owner/pastor 以外は編集できないことを追加。
- `tests/e2e/settings.spec.ts`
  - owner が朝の通知時刻を変更し、reload後も保持されるE2Eを追加。

### 検証状況
- `git diff --check` PASS。
- `npm run test -- tests/unit/group-admin-card.test.tsx tests/unit/church-basics-editor.test.tsx` PASS（2 files / 4 tests）。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm test` PASS（16 files / 67 tests）。
- `npm run db:reset` PASS。
- `npm run db:test` PASS（5 files / 110 tests）。
- `npm run build` PASS。
- `npx playwright test tests/e2e/settings.spec.ts` PASS（3 tests）。
- `supabase db advisors --local --level error --fail-on error` PASS（No issues found）。

### リリース状況
- 修正コミット: `578250f Add group deletion and editable church settings`。
- `git push origin main` PASS。`origin/main` は `1870520..578250f` へ更新。
- remote Supabase migration適用済み。
  - `supabase db push --yes` は `20260705141417_group_delete_guard.sql` を適用し `Finished supabase db push.` で完了。
  - pg-delta catalog cache 警告は出たが、`supabase migration list --linked` で remote `20260705141417` を確認。
  - `supabase db query --linked` で `supabase_migrations.schema_migrations` の `20260705141417` が `applied=1` であることを確認。
  - `supabase db advisors --linked --level error --fail-on error` PASS（No issues found）。
- GitHub連携Vercel Production deployment成功。
  - commit `578250f` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - Vercel status target: `https://vercel.com/asterworks/semeron/BPwX8TABZqQUuCFJyht9gan61EAt`。
- `curl -I -L https://semeron-app.vercel.app/ja/login` で production が `HTTP/2 200` / `server: Vercel` を返すことを確認。

## 現在のチェックポイント — 小グループ削除機能（2026-07-05 23:13 JST）

### 今回の依頼
- 作成した小グループを、アーカイブだけでなく削除できるようにする。

### 確認済みの事実
- 管理画面の `GroupAdminCard` は現在、メンバー追加/削除、リーダー設定、アーカイブ/復元だけを提供している。
- `content_items.group_id` は現行スキーマ上 `on delete set null` なので、そのままグループ削除を許すと小グループ祈祷課題の紐づきが外れる。
- 前回のプライバシー修正後、`visibility='group'` かつ `group_id=null` の公開コンテンツは通常のグループ閲覧対象から外れるため、履歴を壊さない削除条件が必要。

### 方針
- 空の小グループは管理画面から削除できるようにする。
- 祈祷課題/応答など `content_items` が紐づいている小グループは削除不可にし、アーカイブ運用を促す。
- UIだけでなくDBトリガでも削除ガードを入れ、画面外のAPI操作でも履歴の孤立を防ぐ。

### 実装済み
- `supabase migration new group_delete_guard` で `20260705141417_group_delete_guard.sql` を作成。
  - `private.prevent_group_delete_with_content()` を追加。
  - `groups_prevent_delete_with_content` trigger により、`content_items.group_id` が残る小グループ削除を `23503` で拒否。
- `app/lib/db/actions.ts`
  - `deleteGroup` Server Action を追加。
  - active member かつ church admin role のみ実行可。
  - 削除不可のDBエラーを `group has content` に正規化。
  - 削除成功時に `audit_logs` へ `group.deleted` を記録。
- `app/components/admin/GroupAdminCard.tsx`
  - 削除ボタンと確認モーダルを追加。
  - 履歴ありで削除不可の場合は、アーカイブを促す具体的なエラーを表示。
- `app/lib/i18n/messages.ts`
  - 小グループ削除用の日英文言を追加。
- `supabase/tests/rls_regressions.test.sql`
  - 関連contentがある小グループは削除不可。
  - 関連contentがない小グループは削除でき、`group_memberships` もcascade削除されることを追加。
- `tests/unit/group-admin-card.test.tsx`
  - 削除確認後に `deleteGroup` が呼ばれること。
  - `group has content` で専用エラーが表示されることを追加。

### 検証状況
- `git diff --check` PASS。
- `npm run test -- tests/unit/group-admin-card.test.tsx` PASS（1 file / 2 tests）。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm run db:reset` PASS。新migration `20260705141417_group_delete_guard.sql` 適用済み。
- `npm run db:test` PASS（5 files / 110 tests）。

### リリース状況
- 修正コミット: `578250f Add group deletion and editable church settings`。
- `git push origin main` PASS。`origin/main` は `1870520..578250f` へ更新。
- remote Supabase migration適用済み。
  - `supabase db push --yes` は `20260705141417_group_delete_guard.sql` を適用し `Finished supabase db push.` で完了。
  - pg-delta catalog cache 警告は出たが、`supabase migration list --linked` で remote `20260705141417` を確認。
  - `supabase db query --linked` で `supabase_migrations.schema_migrations` の `20260705141417` が `applied=1` であることを確認。
  - `supabase db advisors --linked --level error --fail-on error` PASS（No issues found）。
- GitHub連携Vercel Production deployment成功。
  - commit `578250f` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - Vercel status target: `https://vercel.com/asterworks/semeron/BPwX8TABZqQUuCFJyht9gan61EAt`。
- `curl -I -L https://semeron-app.vercel.app/ja/login` で production が `HTTP/2 200` / `server: Vercel` を返すことを確認。

## 現在のチェックポイント — 小グループ祈祷課題の公開範囲 + 応答匿名化（2026-07-05 23:04 JST）

### 今回の依頼
- 小グループ向けに提出した祈祷課題が他の人にも見えてしまっているため修正する。
- デボーションへの応答は全員匿名表示にする。

### 確認済みの事実
- 既存RLSでは `published` な `visibility='group'` のコンテンツを、当該グループメンバーに加えて church admin も閲覧できる設計だった。
- `groups` / `group_memberships` のRLSも、同一教会のactive memberなら小グループメタデータ・メンバー一覧を読める設計だった。
- `/church/{churchSlug}/groups/{groupId}` はURL直打ち時の所属チェックをページ側でしていなかった。
- デボーション応答(reflection)は `content_feed` の `author_membership_id` が残る場合、`getReflections` が実名を解決して `ReflectionCard` に渡していた。
- 既存の匿名強制トリガは祈祷課題のみを対象にしており、reflection は対象外だった。

### 方針
- 小グループ向け `published` content は、作者本人 + 当該グループ所属者だけを通常閲覧可にする。
- 管理者は未承認レビュー段階では見られるが、公開後の会員向け表示ではグループ外なら出さない。
- 小グループ詳細ページは、会員側では当該グループ所属者だけにする。管理者の管理用途は `/admin/.../groups` 側に分ける。
- デボーション応答は既存分も今後分も匿名表示に固定する。編集可否は作者ID表示ではなく `owns_content` RPC で判定する。

### 実装済み
- `supabase migration new group_privacy_reflection_anonymity` で `20260705135614_group_privacy_reflection_anonymity.sql` を作成。
  - `private.can_view_content` を更新し、`published` group content の管理者例外を外した。
  - `groups_select` / `group_memberships_select` を更新し、小グループ情報は所属者または管理者だけに限定。
  - `private.enforce_prayer_anonymity` を更新し、reflection は常に `anonymous=true` にする。
  - 既存reflectionを `anonymous=true` にbackfill。
  - `private.feed_author` を更新し、reflection は本人にも管理者にも `author_membership_id` を返さない。
  - group devotion通知も当該グループ所属者だけに送るよう更新。
- `app/lib/db/queries.ts`
  - prayer feed / group prayers で group-scoped row をアプリ側でも二重フィルタ。
  - reflection の `authorName` は常に匿名名へ固定。
  - reflection の `isMine` は `owns_content` RPC で判定。
- `app/lib/db/actions.ts`
  - `postReflection` が `anonymous: true` を明示してinsert。
- `app/lib/prayers/today.ts`
  - Today選定の安全弁として、viewerの小グループ外のgroup prayerを除外。
- `app/[locale]/church/[churchSlug]/groups/[groupId]/page.tsx`
  - 会員側小グループ詳細ページに所属チェックを追加。
- `app/lib/i18n/messages.ts`
  - 応答フォームの説明を匿名共有に合わせて更新。
- `supabase/tests/rls_content_visibility.test.sql`
  - group content は管理者でもグループ外ならpublished閲覧不可、content_feedにも出ないことを追加/更新。
- `supabase/tests/rls_regressions.test.sql`
  - 非所属者が小グループ詳細/メンバー一覧を読めないことを追加。
- `supabase/tests/rls_anonymity.test.sql`
  - reflection がinsert時に匿名化され、content_feed上は作者本人にもauthorが出ず、編集可否は `owns_content` で残ることを追加。
- `tests/unit/today-prayers.test.ts`
  - 他グループの祈祷課題がToday選定に入らない回帰テストを追加。

### 検証結果
- Supabase changelog確認: 直近のbreaking changeに今回のRLS/既存public table更新へ直接影響するものはなし。
- `git diff --check` PASS。
- `npm run test -- tests/unit/today-prayers.test.ts` PASS（1 file / 5 tests）。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm test` PASS（14 files / 63 tests）。
- `npm run db:reset` PASS。新migration `20260705135614_group_privacy_reflection_anonymity.sql` 適用済み。
- `npm run db:test` PASS（5 files / 107 tests）。
- `npm run build` PASS。
- `supabase db advisors --local --level error --fail-on error` PASS（No issues found）。

### 未完了
- なし。

### リリース状況
- 修正コミット: `94c297e Harden group prayers and anonymous reflections`。
- `git push origin main` PASS。`origin/main` は `eb32d44..94c297e` へ更新。
- remote Supabase migration適用済み。
  - `supabase db push --yes` は `20260705135614_group_privacy_reflection_anonymity.sql` を適用し `Finished supabase db push.` で完了。
  - pg-delta catalog cache 警告は出たが、`supabase migration list --linked` で remote `20260705135614` を確認。
  - `supabase db query --linked` で `supabase_migrations.schema_migrations` の `20260705135614` が `applied=1` であることを確認。
  - `supabase db advisors --linked --level error --fail-on error` PASS（No issues found）。
- GitHub連携Vercel Production deployment成功。
  - commit `94c297e` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - Vercel status target: `https://vercel.com/asterworks/semeron/AX2HBrN3EPxeqFQntQAjXs3CYD3L`。
- `curl -I -L https://semeron-app.vercel.app/ja/login` で production が `HTTP/2 200` / `server: Vercel` を返すことを確認。

## 現在のチェックポイント — デボーションなし日のToday祈りアニメーション日次判定（2026-07-05 22:52 JST）

### 今回の依頼
- パイロット中、今日はデボーション配信なしにしたところ、「今日の祈り」が毎回アニメーション付きで表示されるため確認・修正する。

### 確認済みの事実
- `app/[locale]/church/[churchSlug]/today/page.tsx` のデボーションあり分岐は `TodayDevotionFlow` を通り、日次判定の対象になっている。
- デボーションなし分岐は `GracefulReveal delayMs={140}` を直接使っており、`localStorage` / cookie fallback の日次判定を通っていなかった。
- そのためデボーション配信なしの日は、ページ表示のたびに「今日の祈り」だけが毎回アニメーションしていた。
- `?replayTodayAnimation=1` / `?pwaAnimationFix=...` は検証用の明示リプレイとして維持する。

### 方針
- デボーションあり・なしの両方で、Todayページ全体の同じ日次キー `semeron:today-flow-opened:<churchId>:<todayKey>` を共有する。
- 通常URLでは1日1回だけアニメーションし、2回目以降は静的表示にする。
- `localStorage` が使えないPWA/実機環境でも前回と同じcookie fallbackを使う。
- 明示リプレイURLだけは従来通り毎回アニメーションする。

### 実装済み
- `app/components/member/todayDailyAnimation.ts` を追加。
  - `TodayDevotionFlow` に入っていた日次キー生成、cookie名生成、`localStorage` / cookie fallback の読み書きを共通化。
- `app/components/member/TodayPrayerPreviewFlow.tsx` を追加。
  - デボーションなし日の「今日の祈り」表示に日次判定を適用。
  - 初回通常表示は `GracefulReveal`、同日2回目以降は子要素を静的表示。
  - DOM確認用に `data-testid="today-prayer-preview-flow"` / `data-animate-flow` / `data-animation-replay` を付与。
- `app/[locale]/church/[churchSlug]/today/page.tsx`
  - `!devotion` 分岐を `GracefulReveal` 直書きから `TodayPrayerPreviewFlow` に差し替え。
- `app/components/member/TodayDevotionFlow.tsx`
  - 日次判定ヘルパーを共通ファイルからimportする形に変更。挙動は維持。
- `tests/unit/today-prayer-preview-flow.test.tsx` を追加。
  - デボーションなし日の初回通常表示だけアニメーションすることを確認。
  - 同日remountは静的表示になることを確認。
  - `localStorage` 例外時もcookie fallbackで2回目が静的表示になることを確認。
  - 明示リプレイキーでは同日でもアニメーションすることを確認。

### 検証結果
- `git diff --check` PASS。
- `npm run test -- tests/unit/today-prayer-preview-flow.test.tsx tests/unit/today-devotion-flow.test.tsx tests/unit/today-prayer-carousel.test.tsx` PASS（3 files / 12 tests）。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm test` PASS（14 files / 62 tests）。
- `npm run build` PASS。

### リリース状況
- 修正コミット: `2101572 Gate prayer-only Today animation daily`。
- `git push origin main` PASS。`origin/main` は `9fe0074..2101572` へ更新。
- GitHub連携Vercel Production deployment成功。
  - commit `2101572` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - Vercel status target: `https://vercel.com/asterworks/semeron/Cj1tzms38FzpHzkhE7YDEHNNFu8B`。
- `curl -I -L https://semeron-app.vercel.app/ja/login` で production が `HTTP/2 200` / `server: Vercel` を返すことを確認。

### 未完了
- なし。

## 現在のチェックポイント — Todayアニメーション日次判定の安定化（2026-07-05 22:38 JST）

### 今回の依頼
- 「アニメーションが一日に一回流れるようにしたはずなのに、毎回流れるようになってる」不具合の修正。

### 確認済みの事実
- `app/[locale]/church/[churchSlug]/today/page.tsx` は通常URLでは `animationReplayKey` を渡していない。
- `?replayTodayAnimation=1` または `?pwaAnimationFix=...` が付いたURLだけ、検証用として毎回再生する仕様。
- `TodayDevotionFlow` は `localStorage` の `semeron:today-flow-opened:<churchId>:<todayKey>` だけで日次表示済み判定をしていた。
- そのためPWA/実機ブラウザ等で `localStorage` 読み書きが失敗・消失すると、同日でも毎回「未表示」と判定されうる。

### 方針
- 通常URLの1日1回制限を維持する。
- 検証用URLの明示リプレイ機能は維持する。
- `localStorage` が使えない環境でも同日再訪を静的表示にできるよう、短期cookieを補助保存先にする。
- cookieには `churchId` や日付を直接入れず、日次キーから作った短いハッシュ名だけを保存する。

### 実装済み
- `app/components/member/TodayDevotionFlow.tsx`
  - 日次判定の読み取りを `localStorage` → cookie fallback に変更。
  - 日次判定の書き込みを `localStorage` と3日有効の `SameSite=Lax` cookie の二重保存に変更。
  - `animationReplayKey` がある場合は、従来通り日次フラグを無視して明示リプレイする。
- `tests/unit/today-devotion-flow.test.tsx`
  - 初回通常表示後、同日remountで静的表示になる回帰テストを追加。
  - `localStorage` が読み書きで例外を投げる場合でもcookie fallbackにより同日2回目が静的表示になる回帰テストを追加。

### 検証結果
- `git diff --check` PASS。
- `npm run test -- tests/unit/today-devotion-flow.test.tsx` PASS（1 file / 6 tests）。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm test` PASS（13 files / 59 tests）。
- `npm run build` PASS。

### リリース状況
- 修正コミット: `c61cdfa Stabilize Today daily animation gate`。
- `git push origin main` PASS。`origin/main` は `fe7ac95..c61cdfa` へ更新。
- GitHub連携Vercel Production deployment成功。
  - commit `c61cdfa213971172d81213f7c99f733e4658e36b` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - Vercel status target: `https://vercel.com/asterworks/semeron/7GkSwhqrL6dyvy1fjYZfBZqN1Pym`。
- `curl -I -L https://semeron-app.vercel.app/ja/login` で production が `HTTP/2 200` / `server: Vercel` を返すことを確認。

### 未完了
- なし。

## 現在のチェックポイント — 招待リンク失効/再生成 + 監査ログ閲覧（2026-07-05）

### 今回の依頼
- 前回提案の4と5を実装する。
- 文脈上、4=招待リンクの失効/再生成、5=監査ログ閲覧として実装中。
- 既存未コミットの「牧師に相談」実保存/通知差分は保持したまま作業。

### 実装済み
- `supabase migration new invite_code_rotation_audit_logs` で `20260705081244_invite_code_rotation_audit_logs.sql` を作成。
- `churches` に `invite_code_expires_at` / `invite_code_rotated_at` を追加。
- 既存招待コードは移行時点から30日後に期限切れになるよう backfill。
- `create_church` は新規教会作成時に30日招待コードを作るよう更新。
- `join_church` は期限切れ招待コードを拒否するよう更新。
- `expireInviteCode` / `rotateInviteCode` Server Action を追加。
  - owner/pastor のみ操作可能。
  - 再生成時は10文字の新コード、30日期限、監査ログ `invite.rotated` を記録。
  - 失効時は `invite_code_expires_at=now()`、監査ログ `invite.expired` を記録。
  - 監査ログには招待コード本文を残さない。
- 設定画面の `InviteLinkCard` を操作可能にし、期限・発行時刻・失効/再生成ボタンを表示。
- メンバー画面の招待ボタンは期限切れコードを共有できないようにした。
- 管理ナビに「監査ログ」を追加し、`/admin/{churchSlug}/audit` ページを追加。
  - 直近100件の監査ログを日時・実行者・操作・対象・metadata で表示。
  - 閲覧権限は既存RLSとページ側 `isChurchAdmin` で管理者限定。
- `tests/unit/invite-link-card.test.tsx` を追加。
- `supabase/tests/membership_lifecycle.test.sql` に招待コード期限切れ/期限内のDB回帰テストを追加。

### 変更ファイル
- `supabase/migrations/20260705081244_invite_code_rotation_audit_logs.sql`
- `supabase/tests/membership_lifecycle.test.sql`
- `app/lib/demo/types.ts`
- `app/lib/database.types.ts`
- `app/lib/db/actions.ts`
- `app/lib/db/map.ts`
- `app/lib/db/queries.ts`
- `app/components/admin/InviteLinkCard.tsx`
- `app/components/admin/InviteButton.tsx`
- `app/components/admin/AdminNav.tsx`
- `app/[locale]/admin/[churchSlug]/settings/page.tsx`
- `app/[locale]/admin/[churchSlug]/members/page.tsx`
- `app/[locale]/admin/[churchSlug]/audit/page.tsx`
- `app/lib/i18n/messages.ts`
- `tests/unit/invite-link-card.test.tsx`
- `tests/e2e/settings.spec.ts`
- `HANDOFF.md`

### 検証結果
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm run test -- tests/unit/invite-link-card.test.tsx tests/unit/prayer-request-form.test.tsx` PASS（2 files / 4 tests）。
- `npm test` PASS（13 files / 57 tests）。
- `npm run build` PASS。
- `npm run db:reset` PASS。新マイグレーション適用後、seed状態へ復帰済み。
  - 初回reset時に pg-delta catalog cache timeout 警告が出たが reset は成功。最終resetでは警告なし。
- `npm run db:test` PASS（5 files / 99 tests）。
- `npx playwright test tests/e2e/settings.spec.ts` PASS（2 tests）。
  - 途中で既に `en` 追加済みのDB状態により既存テストが一度タイムアウトしたため、テストを冪等化して再実行済み。
- `git diff --check` PASS。

### 未完了のこと
- 本番デプロイは未実施。
- コミット/プッシュは未実施。

### リリース状況（2026-07-05 21:43 JST）
- 実装一式を `a007f50 Add pastoral follow-up and safety admin tools` として `origin/main` へpush済み。
- Supabase remote migration 適用済み。
  - `supabase migration list` で remote に `20260705081244` が入っていることを確認。
  - `supabase db query --linked` で `churches.invite_code_expires_at` / `invite_code_rotated_at` の存在を確認。
  - `eifuku-minami` に期限/発行時刻がbackfill済みであることを確認。
  - `supabase db push` は `Finished supabase db push.` で完了。pg-delta catalog cache 警告は出たが、migration list/queryで実適用を確認済み。
- Vercel CLI `vercel deploy --prod --yes` は既知の `asterworks` scope 認証問題で失敗。
  - エラー: `Could not retrieve Project Settings.`
  - Vercel connectorも同scopeで403。
  - 代替としてGitHub連携statusを確認。
- GitHub commit status `Vercel` は success。
  - 対象: `a007f50`
  - description: `Deployment has completed`
  - target: `https://vercel.com/asterworks/semeron/CpkpvPrXZRtiPZJ2dQo5eYyt55km`
- 本番疎通確認:
  - `https://semeron-app.vercel.app/ja/login` が HTTP 200。
  - `https://semeron-app.vercel.app/ja/admin/eifuku-minami/audit` は未ログイン時に `/ja/login` へredirectし、最終HTTP 200。

### 次に行うこと
- deploy status 追記コミットをpushし、GitHub/Vercel status と本番疎通を再確認する。

## 現在のチェックポイント — 「牧師に相談」実保存/通知（2026-07-05）

### 今回の依頼
- 前回提案のP0-1「『牧師に相談』トグルを実装する」を実装する。

### 実装済み
- `PrayerRequestForm` が `pastorConsult` を `submitPrayerRequest` へ渡すようにした。
- `submitPrayerRequest` が `content_items.metadata.pastor_consult_requested = true` を保存するようにした。
- `submitPrayerRequest` 成功後、owner/pastor の active membership 宛に in-app 通知を作るようにした。
  - 通知種別: `prayer_request_submitted_to_moderators`
  - 遷移先: `/{locale}/admin/{churchSlug}/prayer-requests`
  - 通知失敗は投稿をブロックせず、server log に出す。
- 投稿IDはServer Action内で `randomUUID()` 生成し、`insert().select()` は使わない。
  - 理由: 匿名強化後、`content_items` 直接SELECTは列レベルで制限されており、`insert().select("id")` は実行時にRLSエラーになったため。
- 通知 `data` には `author_membership_id` を入れない。
  - 理由: 匿名投稿の「牧師にも作者を見せない」境界を崩さないため。
- `ContentItem` / `mapContent` が `pastorConsultRequested` を読み取るようにした。
- モデレーションカードに「個別相談の希望があります」Calloutを表示するようにした。
- `tests/unit/prayer-request-form.test.tsx` を追加し、トグルON時に `pastorConsult: true` がServer Actionへ渡ることを固定した。
- `tests/e2e/pastor-consult.spec.ts` を追加し、会員投稿→管理モデレーション画面で相談希望Calloutが見えることを確認した。

### 変更ファイル
- `app/components/member/PrayerRequestForm.tsx`
- `app/lib/db/actions.ts`
- `app/lib/demo/types.ts`
- `app/lib/db/map.ts`
- `app/components/admin/ModerationCard.tsx`
- `app/lib/i18n/messages.ts`
- `tests/unit/prayer-request-form.test.tsx`
- `tests/e2e/pastor-consult.spec.ts`
- `HANDOFF.md`

### 検証結果
- `npm run typecheck` PASS。
- `npm run test -- tests/unit/prayer-request-form.test.tsx` PASS。
- 初回 `npx playwright test tests/e2e/pastor-consult.spec.ts` はFAIL。
  - 原因: `insert().select("id")` が匿名強化後の `content_items` 直接SELECT制限/RLSに当たった。
  - 修正: Server Actionで `randomUUID()` を生成し、insert後のselectを廃止。
- `npm run db:reset && npx playwright test tests/e2e/pastor-consult.spec.ts` PASS。
- `npm run lint` PASS。
- `npm test` PASS（12 files / 54 tests）。
- `npm run build` PASS。
- `npm run db:test` PASS（5 files / 97 tests）。
- `git diff --check` PASS。

### 未完了のこと
- 本番デプロイは未実施。

### 次に行うこと
- Jimiが希望すれば、commit/push/deployへ進む。

## 現在のチェックポイント — 機能確認と今後機能提案（2026-07-05）

### 今回の依頼
- Semeronの現機能を確認し、「安心・安全・健全に利用できるアプリ」にするため今後実装すべき機能を提案する。
- 現時点ではコード変更依頼ではなく、現状把握と優先順位づけが主目的。

### 完了したこと
- `/Users/james/checkpoint.md` を確認し、途中保存ルールを再確認した。
- CodexメモリーのSemeron項目を確認し、直近の本番リリース、Supabase/Vercel/Playwright検証、プライバシー/テナント分離/通知修正履歴の存在を把握した。
- `README.md`、`package.json`、`app/`、`supabase/`、`tests/`、既存 `HANDOFF.md` の冒頭を確認し、現在の機能マップ作成に着手した。
- `git status --short` は空で、調査開始時点のワークツリーはcleanだった。
- JimiVault `02_Area/個人/Aster Works/Semeron/` の設計/セキュリティ/ロードマップ/実装メモを確認した。
- 主要Server Actions、Today、祈祷課題投稿/編集/モデレーション、Pastor Assist、通知dispatch、招待/参加、メンバー管理、Me画面、管理ダッシュボード、Playwright E2E範囲を確認した。

### 確認済みの現機能
- 会員向け: Today、祈り、グループ、受信、自分、設定、PWA、通知設定、退会/アカウント削除導線。
- 管理向け: ダッシュボード、デボーション、祈祷課題モデレーション/CSV取り込み/週報、グループ、メンバー、通知、設定、Pastor Assist。
- 安全基盤: Supabase RLS、教会分離、匿名マスク、承認制、期限切れ非表示、完了ログ本人限定、監査ログ、AI opt-in/人間レビュー前提。

### 主な所見
- 現状は「デボーションPWA」よりかなり進んでおり、教会作成/招待、認証、会員Today、祈祷課題承認、グループ、通知、管理、AI補助、人間レビュー、退会/削除まで実装済み。
- 安全設計の土台は強い。特にRLS、教会分離、匿名sticky、公開済み祈祷課題編集時の再審査、認証済みHTMLをPWAキャッシュしない方針は維持すべき。
- ただし、広く安心して使うには「運用・同意・緊急対応・招待管理」の層がまだ弱い。
- 具体的な穴: `PrayerRequestForm` の `pastorConsult` トグルはUI stateのみで、`submitPrayerRequest` に渡らずDBにも保存されない。利用者が牧師に相談したつもりでも、実際には特別な通知/フラグにならない。
- `consent_records` と `audit_logs` のDB基盤はあるが、同意取得UI/管理UI/監査ログ閲覧UIはまだ限定的または未実装に見える。
- 招待コードは固定表示/コピーが中心で、失効・再生成・参加承認・上限・漏洩時のローテーション導線は未確認。

### 検証結果
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm test` PASS（11 files / 53 tests）。
- `npm run build` PASS。
- `npm run db:test` PASS（5 files / 97 tests）。
- Playwright E2Eは今回実行せず、既存テスト内容の確認のみ。対象は会員ライフサイクル、PWAキャッシュ、設定保存。

### 提案方針
- P0: 相談トグル実保存/通知、同意記録とプライバシー/利用規約、緊急・セーフガーディング導線、招待リンク失効/再生成、監査ログ閲覧を優先。
- P1: 通知内容のプライバシー設定、公開範囲の二重確認/二者承認、報告/修正依頼ワークフロー、モデレーター向け安全チェックリスト、データ保持/エクスポート。
- P2: 未成年/保護者同意、教会別ポリシーテンプレート、アクセシビリティ強化、オフラインは静的/非機微に限定。

### 未完了のこと
- 実ブラウザでの会員/管理者フロー目視確認。
- Playwright E2Eの再実行。
- 具体的な実装作業。

### 次に行うこと
- Jimiに機能確認結果と優先実装案を返す。
- 実装へ進む場合はP0から順に、まず `pastorConsult` の永続化/通知と同意記録UIを切るのがよい。

## 現在のチェックポイント — 全体レビュー改善（2026-07-04 午後）

### 今回の依頼
- 前回の全体レビューで出したP1/P2/P3改善を、推奨順に実装していく。
- コミット・プッシュ・デプロイの依頼はまだないため、現時点ではローカル実装と検証まで。

### 完了したこと
- Next.js App Router/Supabase作業方針を確認。
- 既存未コミット差分を確認し、管理デボーション日付修正とToday祈祷カード初期表示修正は保持したまま作業中。
- P1のうち、READMEの現状乖離、package manager表記、DB/RLS検証の再現性改善に着手。

### 実装済み
- `package.json`
  - `packageManager` を実運用に合わせて `npm@11.17.0` に変更。
  - `db:test:reset` を追加し、`db:reset` 後に `db:test` を走らせる明示的なリリース前ゲートを用意。
- `README.md`
  - 冒頭の「Phase 1 / Supabase未連携」表現を、実Supabase接続済みのパイロット版説明に更新。
  - ローカル確認手順に `db:test:reset` を追加。
  - 古い検証件数（unit 31 / RLS 56）を固定値として読ませない表現に変更。
- `supabase/tests/rls_content_visibility.test.sql`
  - 手動確認でseedデボーションにcompletion_logsが増えても集計テストが揺れないよう、テスト専用のpublished devotionとcompletion_logsをトランザクション内に作る形へ変更。
- `supabase/tests/rls_regressions.test.sql`
  - dirty DB上の既存デボーション日付と衝突しにくいよう、テスト挿入の devotion_date を2099年台へ変更。
- `app/lib/db/action-helpers.ts`
  - `actions.ts` に混在していた membership 解決、役割判定、教会タイムゾーン日付変換を server-only ヘルパーとして切り出し。
  - 既存コンポーネントの import 先は変えず、`actions.ts` の外部API互換を維持。
- `app/lib/db/map.ts` / `app/lib/db/queries.ts`
  - DB行マッパと主要クエリの `any` 集中を緩和し、生成済みSupabase型・小さなRow型へ寄せた。
  - `content_feed` view の nullable 生成型は、アプリのドメイン型へ入れる境界で吸収。
- `tests/unit/devotion-form.test.tsx`
  - 「Todayに表示する日」と「公開予約日」のラベル/説明が分かれることを固定。
  - 公開予約日は明日以降だけ予約可能で、当日は無効化されることを固定。
- `app/[locale]/admin/[churchSlug]/notifications/page.tsx`
  - 通知一覧の上部に queued/sent/skipped/failed の状態別件数を表示。
- `app/api/notifications/dispatch/route.ts`
  - cron dispatch の匿名集計を `console.info` / `console.warn` / `console.error` に出し、Vercel logsで追えるようにした。

### 検証結果
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm test` PASS（11 files / 53 tests）。
- `npm run build` PASS。
- `npm audit --omit=dev` PASS（0 vulnerabilities）。
- `npm run db:test` PASS（5 files / 97 tests）。リセットなしの現在ローカルDBでも通過。
- `git diff --check` PASS。
- `npm run db:test:reset` はDB resetを伴うため未実行。リリース前の強いゲートとして用意済み。

### リリース状況
- Jimiから「すぐにデプロイまで」の依頼あり。
- 変更一式を `791f568 Harden Semeron review findings` として `origin/main` へpush済み。
- Vercel Git連携の commit status `Vercel` が success（Deployment has completed）を返したことを確認。
- 本番URL `https://semeron-app.vercel.app/ja/login` がHTTP 200を返し、Semeronログイン画面HTMLを取得できることを確認。
- ローカルVercel CLI/APIは `asterworks` scope の認証不足で直接deploy/log取得できなかったため、今回の本番反映確認はGitHub連携status + production URL疎通で実施。
- `npm run db:test:reset` とPlaywright E2Eは未実行。今回の即時デプロイでは、既にgreenの軽量ゲートと `npm run db:test` を採用する。

### 次に行うこと
- 必要なら別作業で Vercel CLI / MCP の `asterworks` scope 認証を更新し、`vercel logs --level error` まで確認できる状態に戻す。

## 依頼（JimiのパイロットFB）
- Todayに表示する祈祷課題は全部ではなく「今日の祈り」5件にする。
- 選出ロジックは5系統にする。
- 表示は1件ずつ。`祈りました` を押すと、静かで良い感じのアニメーションで次の祈祷課題が出る。
- 追加FB（2026-07-04）:
  - 祈祷課題の切り替えアニメーションをもっと gracefully に、優しくゆっくり変わるようにする。
  - アプリを開いたあと、デボーションの文字もゆっくり登場する演出を検討・実装する。
  - 5件祈り終わったあと、もう一度「今日の祈り」を最初から繰り返せるボタンを追加する。
- 追加FB（2026-07-04 深夜）:
  - 設定変更後もアニメーションが早く、ややカクカクして見えるため、さらにしっかり改善する。
- 追加FB（2026-07-04 継続）:
  - フェードアウトは良いが、フェードインをさらにゆっくりにする。
  - フェードイン/フェードアウトのアニメーションパターンを5つほど用意し、ランダムに発火する。
  - デボーションも同じようにランダムでゆっくりフェードインする。
  - 「今日の応答」も書ける状態で確認したいので、デボーションのテスト用データを用意する。
- 追加FB（2026-07-04 演出案）:
  - Todayを開いた直後は本文エリアを空白にし、みことばと「デボーション」だけがゆっくり現れる。
  - タップまたは下スクロールで「黙想」「祈り」「読みました」「祈りました」「祈祷課題を送る」「牧師に相談する」「まずは今日のみことばに耳を傾けましょう。」が順番に現れる。
  - 「読みました」「祈りました」の両方、または次のタップ/スクロールで「今日の応答」を表示する。
  - 「分かち合う」後、または次のタップ/スクロールで「今日の祈り」を表示する。見出しサイズは「今日の応答」と揃える。
  - 5件すべて祈ったら「みんなの応答」を表示する。
  - dissolve など、フェードイン/アウトの種類をもう少し多様にする。
- 追加FB（2026-07-04 viewport演出修正）:
  - スクロール操作で即フェードインすると、画面外でアニメーションが始まり、見る余地がなくなる。
  - セクションがビューポートに入ってからフェードインするようにする。
  - 「祈祷課題を送る」「牧師に相談する」は礼拝導線を切るため途中には置かず、「今日の祈り」の下に配置し、「今日の祈り」と一緒に登場させる。
- 追加FB（2026-07-04 初回のみ/順序修正）:
  - アニメーション進行は1日のうちで最初にTodayを開いたときだけ発動する。
  - 「今日の応答」は「今日の祈り」の後に配置する。
  - デボーションが書かれていない/配信されていない日は、「今日の祈り」だけがアニメーションで表示されるようにする。
- 追加FB（2026-07-04 実機検証）:
  - 1日1回制限のため、iPhone実機PWAでアニメーションを繰り返し検証できない。
  - 本番ユーザー向けの初回のみ仕様は維持しつつ、検証URLだけ同日内でもアニメーションを再生できる逃げ道を追加する。

## 完了したこと（調査）
- 途中保存ルール `/Users/james/checkpoint.md` を確認済み。
- 既存Today実装は `app/[locale]/church/[churchSlug]/today/page.tsx` で `getPrayerFeed(...).slice(0, 3)` を `PrayerCard` として並べる形だった。
- 既存リアクション登録は `app/lib/db/actions.ts::toggleReaction` が使える。すでに祈っている課題へ再度呼ぶと取り消しになるため、Today専用UIでは `viewerPrayed=true` の場合はサーバー呼び出しをせず次へ進める必要がある。
- 既存データモデルには管理者ピン留め専用列がない。今回の実装ではDBマイグレーションを増やさず、既存の `sensitiveFlags` / `expiresAt` / `groupId` / `prayedCount` / `publishedAt` で5系統を構成する。

## 確定した実装方針
- 新しい純粋関数で、可視な公開済み祈祷課題からその日の5件を決定論的に選ぶ。
- 選出はその日・その閲覧者では固定し、日付が変わるとローテーション枠が変わる。
- 5系統:
  1. 緊急・注意枠: `self_harm_or_immediate_danger` フラグがあるもの。
  2. 日付枠: 表示期限が近いもの。
  3. 関係枠: 自分の小グループに属するもの。
  4. 埋もれ防止枠: `Prayed` が少ないもの。
  5. 新着・ローテーション枠: 日付シードで巡回。
- Today専用のクライアントコンポーネントを作り、1件表示、進捗 `1 / 5`、完了表示、`さらに祈る` 導線を持たせる。

## 未完了
- 本番デプロイは未実施（Jimiから依頼があれば commit/push/deploy へ進む）。

## 実装済み
- `app/lib/prayers/today.ts` を追加。
  - `selectTodayPrayers` が可視祈祷課題から5件を決定論的に選出。
  - 期限切れ、回答済み、感謝報告はToday対象から除外。
  - 同日・同閲覧者では固定、日付変更でローテーションが変わる。
- `app/lib/db/queries.ts` に `getTodayPrayerSet` を追加。
- `app/components/member/TodayPrayerCarousel.tsx` を追加。
  - 1件表示、進捗 `n / 5`、`祈りました` で次へ進む。
  - 既に祈っている課題は `toggleReaction` を呼ばず、取り消しを防ぐ。
  - 完了後に静かな完了表示と `さらに祈る` 導線。
- `app/[locale]/church/[churchSlug]/today/page.tsx` を `getTodayPrayerSet` + `TodayPrayerCarousel` に差し替え。
- `app/lib/i18n/messages.ts` に Today Prayer 文言追加。
- `app/globals.css` に `today-prayer-card-enter` の短いフェード/上移動アニメーションを追加。
- `tests/unit/today-prayers.test.ts` を追加。
- 追加FB対応:
  - `TodayPrayerCarousel` に exit → enter の二段階遷移を追加。既に祈った課題を再周回しても `toggleReaction` を呼ばず、祈った記録を取り消さない。
  - 完了カードに `もう一度祈る` ボタンを追加し、同じ5件を最初から再表示できるようにした。
  - デボーション本文周りに登場演出を追加。初期実装の `devotion-reveal-*` は、最新追加改善で `GracefulReveal` + `motion-pattern-*` に置き換えた。
  - `todayPrayer.repeat` の日英文言を追加。
  - 追加改善: `filter: blur()` と `scale()` を廃止し、低負荷な `opacity` + `translate3d()` のみへ変更。
  - 追加改善: 祈祷カードの exit を 920ms、enter を 1280ms に延長し、React側の切り替え待ち時間もCSS exit時間と揃えた。
  - 追加改善: デボーション登場演出も 1320ms に延長し、段階表示の delay を広げた。
- 最新追加改善:
  - `TodayPrayerCarousel` の祈祷カード入場を 2680〜3360ms に再調整。退場は 1040〜1200ms で維持し、フェードアウトの良さを残した。
  - 祈祷カードの motion pattern を5種類にし、入場/退場の移動方向・距離・easing・duration をパターンごとに変更。初回表示・次カード・完了カード・再周回でランダムに選ばれる。
  - `GracefulReveal` を追加し、デボーションの聖書箇所・牧師の導き・黙想・祈りの導きを、5種類のランダムパターンでゆっくり表示するようにした。
  - デボーション用の reveal duration を 3040〜4160ms に延長した。
  - `prefers-reduced-motion` 時は祈祷カード/デボーション reveal が消えっぱなしにならないように補強した。
  - ローカルDBのテスト用デボーション `e1000000-0000-0000-0000-000000000001` を `2026-07-04` / `published` に更新し、Today画面で「今日の応答」を確認できる状態にした。
- 演出案対応:
  - `app/components/member/TodayDevotionFlow.tsx` を追加。Today本文を intro → 黙想/祈り/アクション → 今日の応答 → 今日の祈り → みんなの応答 の段階表示へ変更。
  - `app/[locale]/church/[churchSlug]/today/page.tsx` のデボーションあり分岐を `TodayDevotionFlow` に差し替え。デボーションありの日は冒頭日付を出さず、本文エリアが空白から始まる。
  - `TodayActions` に `onStatusChange` / `staggered` を追加し、読了/祈り完了を親へ通知しつつボタンとリンクを順番に表示できるようにした。
  - `ReflectionComposer` に `onPosted` を追加し、投稿完了後に「今日の祈り」へ進めるようにした。
  - `TodayPrayerCarousel` に `onCompleted` を追加し、5件完了後に「みんなの応答」へ進めるようにした。
  - 文言を「デボーション」「黙想」「祈り」に変更。
  - `motion-pattern-3` を dissolve 寄りに変更し、デボーション用 `graceful-reveal-enter` に軽い blur/scale のバリエーションを追加。祈祷カード側には blur を効かせない。
- viewport演出修正:
  - `GracefulReveal` に `trigger="in-view"` を追加し、IntersectionObserver でビューポートに入ってから reveal animation を開始できるようにした。
  - Todayの後続セクション（黙想/祈り、アクション、今日の応答、今日の祈り、みんなの応答）は `trigger="in-view"` に変更。
  - `TodayActions` に `showLinks` を追加し、デボーション直後の「祈祷課題を送る」「牧師に相談する」を非表示化。
  - 「祈祷課題を送る」「牧師に相談する」は `TodayDevotionFlow` の「今日の祈り」セクション内、`TodayPrayerCarousel` の下に移動。
  - `today-flow-action-item` の子アニメーションは、親の `graceful-reveal-enter` が始まってから発火するようCSSを変更。
- 初回のみ/順序修正（実装済み・ブラウザ検証済み）:
  - `TodayDevotionFlow` に `todayKey` を追加し、`localStorage` の `semeron:today-flow-opened:<churchId>:<todayKey>` で「その日の初回オープン」を判定する。
  - 初回オープン時だけ、空白開始・段階表示・in-view reveal を発動する。
  - 2回目以降は `stage=4` / `animateFlow=false` とし、全セクションを静的にすぐ表示する。
  - 表示順を「デボーション → 黙想/祈り/読了 → 今日の祈り → 今日の応答 → みんなの応答」に変更。
  - `TodayPrayerCarousel` に `animate` prop を追加し、2回目以降は祈祷カード自体の初期/切替アニメーションも抑えられるようにした。
  - `app/[locale]/church/[churchSlug]/today/page.tsx` で `toDateKey(new Date(), church.timezone)` を算出して `TodayDevotionFlow` へ渡す。
  - デボーション未配信時は「未配信カード」と相談ボタンを出さず、`GracefulReveal` 内で `今日の祈り` だけを表示するよう変更。
  - dev環境のReact Strict Modeで effect が再実行されても初回判定が潰れないよう、`dailyOpenDecision` refで同一マウント中の判定を固定した。
  - `npm run typecheck` PASS。
  - `npm run lint` PASS（初回判定の state 反映は `requestAnimationFrame` 経由に変更して `react-hooks/set-state-in-effect` を回避）。
  - `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
  - `npm test` PASS（7 files / 43 tests）。
  - `npm run build` PASS。

## 検証結果
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
- `npm test` PASS（7 files / 43 tests）。
- `npm run build` PASS。
- ローカルdev server `http://localhost:3070` でブラウザ確認済み。
  - `jimi@eifuku.example / password123` でログイン。
  - `/ja/church/eifuku-minami/today` に `今日の祈り` が表示されることを確認。
  - `祈りました` クリックで `1 / 5` → `2 / 5` に進み、次の祈祷課題へ切り替わることを確認。
  - 375px幅で表示確認。`today-prayer` セクション内の横溢れは 0。
  - 完了画面に `もう一度祈る` が出ることを確認。
  - `もう一度祈る` → `1 / 5` へ戻り、再周回で `祈りました` を押すと `2 / 5` へ進むことを確認。
  - 再周回を最後まで進めると、再び完了画面へ戻ることを確認。
- 追加アニメーション検証:
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
  - `npm run build` PASS。
  - 旧CSSがブラウザに残っていたため、dev server停止 → `.next` 削除 → `npm run dev` 再起動。
  - ブラウザで `today-prayer-card-enter` が `1.28s`、`filter: none` になったことを確認。
  - `祈りました` クリック後、`today-prayer-card-exit` が `0.92s`、次カードの enter が `1.28s` で動くことを確認。
  - build後に `npm run dev` を再起動済み（確認用URL: `http://localhost:3070/ja/church/eifuku-minami/today`）。
- 古い状態ではローカルDBが「今日のデボーション未配信」だったためデボーション登場演出は目視未確認だったが、最新追加改善で 2026-07-04 の published devotion を用意済み。ブラウザ目視は次工程。
- 最新追加改善の検証:
  - `npm run typecheck` PASS。
  - `npm run lint` PASS（初回は `react-hooks/set-state-in-effect` で失敗。`TodayPrayerCarousel` の初回ランダム設定を `requestAnimationFrame` 経由に変更して解消）。
  - `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
  - `npm test` PASS（7 files / 43 tests）。
  - `npm run build` PASS。
  - `supabase db query --local` で `2026-07-04` の published devotion「山に向かって目を上げる」を確認。
  - dev server停止 → `.next` 削除 → `npm run dev` 再起動後、ブラウザで最新CSSを確認。
  - デボーション reveal は `graceful-reveal-enter` で 3.04s / 3.28s / 3.52s / 3.72s のランダムパターン発火を確認。
  - 「もう一度祈る」後の祈祷カードで `today-prayer-card-enter` 3.14s（pattern 2）を確認。
  - `祈りました` クリック後、`today-prayer-card-exit` 1.16s（pattern 2）→ 次カード `today-prayer-card-enter` 3.36s（pattern 4）を確認。
  - 「今日の応答」にテスト文 `アニメーション確認用の応答 2026-07-03T16:19:28.126Z` を投稿し、画面の「みんなの応答」反映とDBの `published` レコードを確認。
  - 最後に `.next` 削除 → `npm run dev` 再起動済み。確認URL: `http://localhost:3070/ja/church/eifuku-minami/today`（dev server session `53548`）。
- 演出案対応の検証:
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm test` PASS（7 files / 43 tests）。
  - `npm run build` PASS。
  - dev server停止 → `.next` 削除 → `npm run dev` 再起動後、ブラウザで最新CSSを確認。
  - 初期表示 250ms 時点で `today-flow` 本文テキストが空、かつ高さは確保されていることを確認。
  - その後、みことばと「デボーション」だけが `graceful-reveal-enter` で登場し、「黙想」「今日の応答」「今日の祈り」は未表示であることを確認。
  - タップで「黙想」「祈り」「読みました」「祈りました」「祈祷課題を送る」「牧師に相談する」「まずは今日のみことばに耳を傾けましょう。」が表示されることを確認。
  - アクションボタン/リンクの個別 stagger は `today-flow-action-item` 1.88s、delay 0ms / 260ms / 520ms / 780ms で発火することを確認。
  - 「読みました」「祈りました」を実際に押し、`setCompletion` が2件成功し、「今日の応答」がフェードインすることを確認。
  - 「今日の祈り」は「今日の応答」と同じ見出し class `text-lg font-semibold text-ink text-balance-safe sm:text-xl` で表示されることを確認。
  - 下スクロールでも「黙想」「祈り」「アクション」段階へ進むことを確認。
  - ローカル状態では今日の祈り5件が既に完了済みだったため、「今日の祈り」表示後に「みんなの応答」もフェードインされることを確認。
  - 最後に `.next` 削除 → `npm run dev` 再起動済み。確認URL: `http://localhost:3070/ja/church/eifuku-minami/today`（dev server session `45546`）。
- viewport演出修正の検証:
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
  - `npm test` PASS（7 files / 43 tests）。
  - `npm run build` PASS。
  - dev server停止 → `.next` 削除 → `npm run dev` 再起動後、ブラウザで最新CSSを確認。
  - 初期introでは「デボーション」が表示され、「黙想」および祈祷課題送信/牧師相談リンクは未表示であることを確認。
  - 「今日の応答」セクションはDOMに出た直後でも、発火ラインに入る前は `graceful-reveal-prep` / `animationName: none` / `opacity: 0` のまま待機することを確認。
  - 少しスクロールしてビューポート内へ入ると `motion-pattern-3 graceful-reveal-enter` / `animationName: graceful-reveal-enter` になり、そこでフェードインが始まることを確認。
  - デボーション直後の段階には「祈祷課題を送る」「牧師に相談する」が出ないことを確認。
  - 「祈祷課題を送る」「牧師に相談する」は `today-prayer-stage` 内、`TodayPrayerCarousel` の下に移動済みで、`today-flow-action-item` 1.88s / delay 520ms, 780ms で「今日の祈り」と一緒に登場することを確認。
  - 最後に `.next` 削除 → `npm run dev` 再起動済み。確認URL: `http://localhost:3070/ja/church/eifuku-minami/today`（dev server session `38238`）。
- 初回のみ/順序修正の検証:
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
  - `npm test` PASS（7 files / 43 tests）。
  - `npm run build` PASS。
  - いったんdev server停止 → `.next` 削除 → `npm run dev` 再起動済み。確認URL: `http://localhost:3070/ja/church/eifuku-minami/today`（dev server session `52998`）。
  - 新規ブラウザコンテキストでログイン直後の初回Todayを確認。開いた直後は `data-animate-flow="true"` かつ本文空、約1.7秒後にみことばと「デボーション」だけが `graceful-reveal-enter` で表示されることを確認。
  - 同一日にリロードすると `data-animate-flow="false"` となり、`今日の祈り` / `今日の応答` / `みんなの応答` が静的に表示され、`graceful-reveal-*` と `today-prayer-card-enter` が発火しないことを確認。
  - 段階進行後のDOM順は `today-prayer-stage` → `today-prayer` → `today-prayer-links` → `today-reflection-section`。`今日の応答` は `今日の祈り` の後、祈祷課題送信/牧師相談リンクは `today-prayer-stage` 内にあることを確認。
  - ローカルDBで今日のデボーション `e1000000-0000-0000-0000-000000000001` を一時的に `draft` へ変更し、未配信日は `today-flow` なし、未配信カードなし、相談ボタンなし、`今日の祈り` だけが `motion-pattern-* graceful-reveal-enter` で表示されることを確認。
  - 未配信分岐の確認後、同デボーションを `published` / `devotion_date=2026-07-04` に復元し、DB上でも `published` に戻ったことを確認。
- リリース前検証（2026-07-04 06:25 JST）:
  - Jimiから「コミット・プッシュ・デプロイ！」の依頼あり。
  - `git status --short` で今回のToday実装一式が未コミットであることを確認。ブランチは `main`、remoteは `origin https://github.com/Aster-Works/semeron.git`。
  - リリース前にローカルdev serverを停止し、`.next` 競合を避けた。
  - `git diff --check` PASS。
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
  - `npm test` PASS（7 files / 43 tests）。
  - `npm run build` PASS。
  - この時点では commit / push / Vercel deploy は未実行。次工程で実行する。
- リリース結果（2026-07-04 06:28 JST）:
  - アプリ変更コミット: `ba0930a Improve Today prayer and devotion flow`。
  - `git push origin main` PASS。`origin/main` は `366ab94..ba0930a` へ更新。
  - `vercel deploy --prod --yes` は失敗。理由: ローカル `.vercel/project.json` が旧チーム `team_DsJGOfctmTCJEy5JeL31PJHA` / project `prj_mIKUqeNK1wa0rWVAYmdiRS10RO1e` を指しているが、現在のVercel認証ではそのチーム/プロジェクトにアクセスできず、Project Settings取得が403相当で失敗。
  - Vercel CLI / connectorで見える現在のチームは `jimiaki7s-projects` / `team_u5HgrjA3vb6FCq14KEFJO0A9` のみ。そこには `semeron` プロジェクトは存在しないため、新規プロジェクト作成や環境変数再設定は行っていない。
  - GitHub連携デプロイは成功。`gh api repos/Aster-Works/semeron/commits/ba0930a/status` で `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - GitHub deployment: `5304987487` / Production / sha `ba0930ac9ca11a65dbfef9a49b3a3e3f35a12253`。
  - Vercel deployment URL: `https://semeron-nx66n1i0d-asterworks.vercel.app`。
  - `curl -I -L https://semeron-app.vercel.app/ja/church/eifuku-minami/today` で production が応答することを確認。未ログインのため `/ja` → `/ja/login` にリダイレクトされ、最終 `HTTP/2 200` / `server: Vercel`。
  - 注意: 今後CLIから直接 `vercel deploy --prod --yes` したい場合は、Vercel CLIの認証を `asterworks` 側プロジェクトへアクセスできるアカウント/チームに戻すか、`.vercel/project.json` を現行のアクセス可能なSemeronプロジェクトへ relink する必要がある。
- PWAアニメーションちらつき対応（2026-07-04 06:42 JST / 実装・検証済み）:
  - Jimiが iPhone 16e のPWAで、Todayアニメーションがちらついて全然良くないと報告。
  - 原因候補として、テキストを含む大きなブロックへの `filter: blur()` / `scale()` / `translate3d()` / 常時 `will-change` / `backface-visibility` が、iOS WebKit standalone PWAで再ラスタライズやレイヤーちらつきを起こしていると判断。
  - `app/globals.css` の5つの `motion-pattern-*` は維持しつつ、パターン差を duration / easing / 小さな `translateY` のみに変更。
  - `graceful-reveal-enter` から `filter` と `scale` を完全に除去。`will-change: opacity, transform, filter` と `backface-visibility` も除去。
  - `today-prayer-card-*` と `today-flow-action-item` も `translate3d()` から `translateY()` に変更し、PWAでの不要な3Dレイヤー化を抑制。
  - `TodayPrayerCarousel` の5パターンdurationを、PWAでちらつきが目立ちにくい 2020〜2760ms enter / 700〜880ms exit に短縮。
  - `git diff --check` PASS。
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm run test -- tests/unit/today-prayers.test.ts` PASS（4 tests）。
  - `npm test` PASS（7 files / 43 tests）。
  - `npm run build` PASS。
  - `.next` 削除 → `npm run dev` 再起動済み。確認URL: `http://localhost:3070/ja/church/eifuku-minami/today`（dev server session `66235`）。
  - Playwright mobile viewport（iPhone相当UA / 393x852 / touch）で初回Todayを確認。`data-animate-flow="true"`、`graceful-reveal-enter` が発火し、computed style は `filter: none` / `will-change: auto` / `transform: matrix(...)`（2D translate）であることを確認。
  - ブラウザ上の配信CSSに `filter: blur` / `motion-enter-blur` / `scale(` / `translate3d(` / `backface-visibility` が含まれないことを確認。
  - `.motion-pattern-1`〜`.motion-pattern-5` の5パターンはブラウザ上でも5件存在し、duration / easing / 小さな `translateY` の違いとして維持されていることを確認。
  - アプリ内ブラウザも新規タブで `http://localhost:3070/ja/church/eifuku-minami/today?pwaAnimationFix=...` を開き、ページ応答を確認。
- PWAアニメーションちらつき対応リリース結果（2026-07-04 06:50 JST）:
  - アプリ変更コミット: `bc7b2d2 Optimize Today animations for mobile PWA`。
  - `git push origin main` PASS。`origin/main` は `4c368a6..bc7b2d2` へ更新。
  - GitHub連携Vercel Production deployment成功。commit `bc7b2d261c25ab8d983c7aad3a05218c43008506` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - GitHub deployment: `5305159140` / Production。
  - Vercel deployment URL: `https://semeron-jptkw9vk7-asterworks.vercel.app`。
  - `curl -I -L https://semeron-app.vercel.app/ja/church/eifuku-minami/today` で production が応答することを確認。未ログインのため `/ja` → `/ja/login` にリダイレクトされ、最終 `HTTP/2 200` / `server: Vercel`。
  - 注意: `vercel deploy --prod --yes` の直接CLI実行は、現行Vercel認証から旧 `asterworks` チーム/プロジェクトへアクセスできないため引き続き不可。今回はGitHub連携デプロイで本番反映を確認済み。
- 実機検証用アニメーションリプレイ対応（2026-07-04 07:00 JST / 調査・方針確定）:
  - `TodayDevotionFlow` は `localStorage` の `semeron:today-flow-opened:<churchId>:<todayKey>` で「その日の初回オープン」を判定している。
  - そのため同じiPhone PWAでは、通常リロード/再オープンだけでは2回目以降 `data-animate-flow="false"` になり、アニメーション検証ができない。
  - 方針: `?replayTodayAnimation=1` または既存検証URLの `?pwaAnimationFix=...` が付いた時だけ、日次フラグを無視して `animateFlow=true` にする。
  - 通常URLではこれまで通り1日1回だけ発火する。本番ユーザー向けUIには検証ボタンや説明文を出さない。
  - 実装: `app/[locale]/church/[churchSlug]/today/page.tsx` が `searchParams` から検証キーを読み取り、`TodayDevotionFlow` に `animationReplayKey` として渡す。
  - 実装: `TodayDevotionFlow` は `animationReplayKey` がある時だけ日次フラグを無視し、`setStage(0)` / `setReady(false)` から初回演出を再発火する。通常URLでは従来通り日次フラグを見る。
  - 実装: DOM確認用に `data-animation-replay="true|false"` を追加。
  - 追加テスト: `tests/unit/today-devotion-flow.test.tsx` で、日次フラグありの通常再訪は静的表示、検証キーありは同日でも `data-animate-flow="true"` になることを確認する。
  - `git diff --check` PASS。
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm run test -- tests/unit/today-devotion-flow.test.tsx` PASS（2 tests）。
  - `npm test` PASS（8 files / 45 tests）。
  - `npm run build` PASS。
  - `npm run dev` 起動済み（session `10478` / `http://localhost:3070`）。
  - アプリ内ブラウザで `http://localhost:3070/ja/church/eifuku-minami/today?pwaAnimationFix=codex-replay-check` を開き、`data-animate-flow="true"` / `data-animation-replay="true"` を確認。
  - 同じタブで通常URL `http://localhost:3070/ja/church/eifuku-minami/today` を開くと、`data-animate-flow="false"` / `data-animation-replay="false"` になり、通常の1日1回制限が維持されることを確認。
  - `http://localhost:3070/ja/church/eifuku-minami/today?replayTodayAnimation=1` でも `data-animate-flow="true"` / `data-animation-replay="true"` を確認。
- 実機検証用アニメーションリプレイ対応リリース結果（2026-07-04 07:06 JST）:
  - アプリ変更コミット: `1aeac9f Add Today animation replay mode`。
  - `git push origin main` PASS。`origin/main` は `741b583..1aeac9f` へ更新。
  - GitHub連携Vercel Production deployment成功。commit `1aeac9f2b0f493cb3dc61f52b3156f6e465edfbf` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - GitHub deployment: `5305311466` / Production。
  - Vercel deployment URL: `https://semeron-42rvjt6ub-asterworks.vercel.app`。
  - `curl -I -L 'https://semeron-app.vercel.app/ja/church/eifuku-minami/today?replayTodayAnimation=1'` で production が応答することを確認。未ログインのため `/ja` → `/ja/login` にリダイレクトされ、最終 `HTTP/2 200` / `server: Vercel`。
  - 注意: `vercel deploy --prod --yes` の直接CLI実行は、現行Vercel認証から旧 `asterworks` チーム/プロジェクトへアクセスできないため引き続き不可。今回はGitHub連携デプロイで本番反映を確認済み。
- ビューポート発火タイミング調整（2026-07-04 / 実装中）:
  - Jimiの追加FB: ビューポート判定は、もう少しスクロールしてから発火してほしい。
  - `?replayTodayAnimation=1` / `?pwaAnimationFix=<任意の値>` でアニメーションを再発火できるオプションは維持する。
  - `GracefulReveal` の `IntersectionObserver` 設定を `rootMargin: "0px 0px -18% 0px"` / `threshold: 0.18` から、`rootMargin: "0px 0px -32% 0px"` / `threshold: 0.24` に変更。
  - これにより、後続セクションが以前より画面内へ深く入ってから reveal animation が始まる。
  - `tests/unit/graceful-reveal.test.tsx` を追加し、in-view reveal のObserver設定を固定。
- 旧アニメーション復帰（2026-07-04 / 実装中）:
  - Jimiの追加FB: `opacity + ごく小さい translateY` にする以前のアニメーションへ戻す。
  - `bc7b2d2 Optimize Today animations for mobile PWA` で短縮/軽量化したToday motionを、直前のゆっくりした5パターンへ戻した。
  - `app/globals.css` の `motion-pattern-*` に `--motion-enter-x` / `--motion-enter-scale` / `--motion-enter-blur` を戻し、`graceful-reveal-enter` は blur / scale / translate3d を含む旧keyframesへ復帰。
  - `TodayPrayerCarousel` の5パターンdurationも 2860〜3360ms enter / 1040〜1200ms exit に戻した。
  - `?replayTodayAnimation=1` / `?pwaAnimationFix=<任意の値>` のURL再発火オプションは維持。
  - `git diff --check` PASS。
  - `npm run test -- tests/unit/graceful-reveal.test.tsx tests/unit/today-devotion-flow.test.tsx` PASS（2 files / 3 tests）。
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm test` PASS（9 files / 46 tests）。
  - `npm run build` PASS。
  - `.next` 削除 → `npm run dev` 再起動済み（session `80371` / `http://localhost:3070`）。
  - アプリ内ブラウザで `http://localhost:3070/ja/church/eifuku-minami/today?replayTodayAnimation=1&motionRestoreCheck=2` を開き、`data-animate-flow="true"` / `data-animation-replay="true"` を確認。
  - 配信CSSに `filter: blur(var(--motion-enter-blur` / `scale(var(--motion-enter-scale` / `translate3d(` が含まれることを確認。実行中の `graceful-reveal-enter` も `animationName=graceful-reveal-enter` / `animationDuration=3.28s` を確認。
- ビューポート発火タイミング調整 + 旧アニメーション復帰リリース結果（2026-07-04 07:26 JST）:
  - アプリ変更コミット: `f10596b Restore Today motion timing`。
  - `git push origin main` PASS。`origin/main` は `dda9290..f10596b` へ更新。
  - GitHub連携Vercel Production deployment成功。commit `f10596b5b4a06262a389bf04ff07e0dc8e97ea2d` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - GitHub deployment: `5305456127` / Production。
  - Vercel deployment URL: `https://semeron-g8udocnok-asterworks.vercel.app`。
  - `curl -I -L 'https://semeron-app.vercel.app/ja/church/eifuku-minami/today?replayTodayAnimation=1'` で production が応答することを確認。未ログインのため `/ja` → `/ja/login` にリダイレクトされ、最終 `HTTP/2 200` / `server: Vercel`。
  - 注意: `vercel deploy --prod --yes` の直接CLI実行は、現行Vercel認証から旧 `asterworks` チーム/プロジェクトへアクセスできないため引き続き不可。今回はGitHub連携デプロイで本番反映を確認済み。
- スクロール誘導キュー追加（2026-07-04 / 出荷済み）:
  - Jimiの追加FB: スクロールで後続セクションのアニメーションが発火する前に、ユーザーへ「スクロールできる」ことをうっすら伝えたい。
  - `TodayDevotionFlow` に `today-scroll-cue` を追加。初回/リプレイ演出中、`stage < 4` の間だけ画面下に控えめな「続きへ / Continue」ピルを表示する。
  - 通常の同日2回目表示（`data-animate-flow="false"`）では表示しない。
  - `?replayTodayAnimation=1` / `?pwaAnimationFix=<任意の値>` のURL再発火オプションは維持。
  - `tests/unit/today-devotion-flow.test.tsx` に、通常再訪ではキュー非表示、リプレイ演出ではキュー表示の検証を追加。
  - `git diff --check` PASS。
  - `npm run test -- tests/unit/today-devotion-flow.test.tsx tests/unit/graceful-reveal.test.tsx` PASS（2 files / 3 tests）。
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm test` PASS（9 files / 46 tests）。
  - `npm run build` PASS。
  - アプリ内ブラウザで `http://localhost:3070/ja/church/eifuku-minami/today?replayTodayAnimation=1&scrollCueCheck=1` を開き、`data-animate-flow="true"` / `data-animation-replay="true"` / `today-scroll-cue` 表示を確認。キューは fixed / pointer-events none / text `続きへ`。
  - 同じタブで通常URL `http://localhost:3070/ja/church/eifuku-minami/today` を開き、`data-animate-flow="false"` / `data-animation-replay="false"` / `today-scroll-cue` 非表示を確認。
- スクロール誘導キュー追加リリース結果（2026-07-04 07:34 JST）:
  - アプリ変更コミット: `ddf2bfd Add Today scroll cue`。
  - `git push origin main` PASS。`origin/main` は `abd7775..ddf2bfd` へ更新。
  - GitHub連携Vercel Production deployment成功。commit `ddf2bfd4ea2c9a82a92e61fe748b5dc6e07b5e35` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - GitHub deployment: `5305505256` / Production。
  - Vercel deployment URL: `https://semeron-32q3bxfcd-asterworks.vercel.app`。
  - `curl -I -L 'https://semeron-app.vercel.app/ja/church/eifuku-minami/today?replayTodayAnimation=1&scrollCueCheck=1'` で production が応答することを確認。未ログインのため `/ja` → `/ja/login` にリダイレクトされ、最終 `HTTP/2 200` / `server: Vercel`。
  - 注意: `vercel deploy --prod --yes` の直接CLI実行は、現行Vercel認証から旧 `asterworks` チーム/プロジェクトへアクセスできないため引き続き不可。今回はGitHub連携デプロイで本番反映を確認済み。
- スクロール誘導キューの複数地点化 + 祈り導線整理（2026-07-04 / 出荷済み）:
  - Jimiの追加FB: スクロール誘導UIを最初だけでなく、「今日の祈り」の前、「今日の祈り」の後、「今日の応答」の後にも表示したい。
  - `TodayDevotionFlow` のステージを `0..5` に拡張。祈り完了後に一気に応答/みんなの応答へ進めず、`祈り完了 → 祈り後キュー → 祈祷課題/牧師相談ボタン → 今日の応答 → 応答後キュー → みんなの応答` の順にした。
  - 固定の `today-scroll-cue` はステージに応じて `続きへ` / `今日の祈りへ` / `みんなの応答へ` を表示。
  - Jimiの追加FB（画像確認後）: セクション内・左下に出るピルは不要。最初に中央下部へさりげなく出る固定キューと同じ見え方を、セクションの変わり目にも使う。
  - `today-scroll-cue-inline` と各セクション内のインラインキューDOMを撤去。スクロール誘導は中央下部の固定表示のみ。
  - `祈祷課題を送る` / `牧師に相談する` は `stage >= 3`、つまり5件の祈り完了後にだけ表示し、`GracefulReveal` の in-view 発火でゆっくりフェードインする。
  - `TodayPrayerCarousel` の通常祈りカードから `さらに祈る` を削除。`今日、共に覚えて祈りました` 完了カードのみに `さらに祈る` を残した。
  - `tests/unit/today-devotion-flow.test.tsx` に段階表示の回帰テストを追加。`tests/unit/today-prayer-carousel.test.tsx` を追加し、`さらに祈る` の配置を固定。
  - `git diff --check` PASS。
  - `npm run test -- tests/unit/today-devotion-flow.test.tsx tests/unit/today-prayer-carousel.test.tsx tests/unit/graceful-reveal.test.tsx` PASS（3 files / 6 tests）。
  - `npm run typecheck` PASS。
  - `npm run lint` PASS。
  - `npm test` PASS（10 files / 49 tests）。
  - `npm run build` PASS。
  - ローカルブラウザ確認: `http://localhost:3070/ja/church/eifuku-minami/today?replayTodayAnimation=1&scrollCueCenterCheck=1` を開き、`data-animate-flow="true"` / `data-animation-replay="true"` を確認。
  - 初期固定キュー: `fixedPosition="fixed"` / `fixedCueText="続きへ"` / `centerDelta=0`。`.today-scroll-cue-inline` は0件、旧インラインtest idも存在しない。
  - 初期: 固定キュー `続きへ`、祈り/応答/祈り後リンク/みんなの応答は未表示。
  - 1回目スクロール後: 中央下部の固定キューで `今日の祈りへ` 表示。`centerDelta=0` / `.today-scroll-cue-inline` は0件。
  - 祈りセクション: 完了カードにのみ `さらに祈る` が残り、`祈祷課題を送る` / `牧師に相談する` は祈り完了後の段階で表示。`今日の応答` はまだ未表示。
  - 次スクロール後: `今日の応答` 表示、中央下部の固定キューで `みんなの応答へ` 表示、`みんなの応答` はまだ未表示。
  - 次スクロール後: `みんなの応答` 表示、固定キューは消える。
  - 注意: 127.0.0.1 で開くと Next dev の cross-origin HMR ブロックで hydration が止まるため、ローカルブラウザ確認は `localhost:3070` を使う。
  - Jimi指示により、出荷時の追加テスト再実行は省略（上記の検証は出荷前に実施済み）。
- スクロール誘導キューの複数地点化 + 祈り導線整理リリース結果（2026-07-04 08:06 JST）:
  - アプリ変更コミット: `2532b9f Refine Today scroll cue flow`。
  - `git push origin main` PASS。`origin/main` は `b12dbf3..2532b9f` へ更新。
  - GitHub連携Vercel Production deployment成功。commit `2532b9f9f70fa7a5dfb6db0d40671a3aaaae8c32` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - GitHub deployment: `5305705172` / Production。
  - Vercel deployment URL: `https://semeron-s4pux9l52-asterworks.vercel.app`。
  - `curl -I -L 'https://semeron-app.vercel.app/ja/church/eifuku-minami/today?replayTodayAnimation=1&scrollCueCenterCheck=1'` で production が応答することを確認。未ログインのため `/ja` → `/ja/login` にリダイレクトされ、最終 `HTTP/2 200` / `server: Vercel`。
  - 注意: `vercel deploy --prod --yes` の直接CLI実行は、現行Vercel認証から旧 `asterworks` チーム/プロジェクトへアクセスできないため引き続き不可。今回はGitHub連携デプロイで本番反映を確認済み。
- デボーション区切り単位 + クリックスクロール対応（2026-07-04 / 出荷済み）:
  - Jimiの追加FB: 「まずは今日のみことばに耳を傾けましょう。」の罫線までをひとかたまりとして表示し、そこで中央下部のスクロール誘導キューを出したい。
  - `TodayDevotionFlow` の stage 1 を `today-devotion-guidance-stage` として1つの `GracefulReveal` に統合。黙想カード、祈りカード、TodayActions、完了文、罫線を同じ区切りとして扱う。
  - `読みました` / `祈りました` 完了時に自動で `今日の祈り` を出す動きを停止。罫線まで見せたあと、スクロール/キュー操作で `今日の祈り` へ進む。
  - 5件の祈り完了時も、自動で `祈祷課題を送る` / `牧師に相談する` を出さず、次のスクロール/キュー操作で表示する。
  - `today-scroll-cue` をクリック/タップ可能なbuttonに変更。押すと次のセクションをstage表示し、`scrollIntoView({ behavior: "smooth", block: "center" })` でアニメーションが始まる位置へ自動スクロールする。
  - 低速/軽減モーション設定では自動スクロールを `auto` にする。
  - 通常の同日再訪（非アニメーション）は stage 5 まで表示し、従来どおり全体を静的表示する。
  - `tests/unit/today-devotion-flow.test.tsx` は新しい段階順とキュークリックのscrollIntoViewを検証するよう更新。
  - `git diff --check` PASS。
  - `npm run test -- tests/unit/today-devotion-flow.test.tsx tests/unit/today-prayer-carousel.test.tsx tests/unit/graceful-reveal.test.tsx` PASS（3 files / 7 tests）。
  - `npm run typecheck` は一度 `scrollTimer` 型で失敗（`number` vs `Timeout`）→ `number | null` に修正して PASS。
  - `npm run lint` PASS。
  - `npm test` PASS（10 files / 50 tests）。
  - `npm run build` PASS。
  - ローカルブラウザ確認: `http://localhost:3070/ja/church/eifuku-minami/today?replayTodayAnimation=1&scrollCueClickCheck=1` を開き、初期キューが `BUTTON` / `pointer-events: auto` / text `続きへ` であることを確認。
  - 初回キューclick後: `today-devotion-guidance-stage` が表示され、罫線文言「まずは今日のみことばに耳を傾けましょう。」が存在。`今日の祈り` はまだ未表示。
  - 次のキューclick後: `today-prayer-stage` が表示され、`scrollY=210.5` の自動スクロールを確認。`today-prayer-links` はまだ未表示。
- デボーション区切り単位 + クリックスクロール対応リリース結果（2026-07-04 08:20 JST）:
  - アプリ変更コミット: `27cbebd Add Today cue click scrolling`。
  - `git push origin main` PASS。`origin/main` は `b1c8c3f..27cbebd` へ更新。
  - GitHub連携Vercel Production deployment成功。commit `27cbebd9c7f3d06ab17d73469d9ce20ce0f60179` の `context=Vercel` / `state=success` / `description=Deployment has completed` を確認。
  - GitHub deployment: `5305787171` / Production。
  - Vercel deployment URL: `https://semeron-jahkxe5ku-asterworks.vercel.app`。
  - `curl -I -L 'https://semeron-app.vercel.app/ja/church/eifuku-minami/today?replayTodayAnimation=1&scrollCueClickCheck=1'` で production が応答することを確認。未ログインのため `/ja` → `/ja/login` にリダイレクトされ、最終 `HTTP/2 200` / `server: Vercel`。
  - 注意: `vercel deploy --prod --yes` の直接CLI実行は、現行Vercel認証から旧 `asterworks` チーム/プロジェクトへアクセスできないため引き続き不可。今回はGitHub連携デプロイで本番反映を確認済み。

## 次に行うこと
- JimiのiPhone実機PWAで `?replayTodayAnimation=1` 付きURL、または `?pwaAnimationFix=<任意の値>` 付きURLを開いて、同日内に何度でもアニメーションと発火タイミング、スクロール誘導キューを確認する。
- 将来の拡張候補: 管理者が明示的に「今日の祈りへピン留め」できる列/UIを追加する。

---

# 現在のHANDOFF — 管理画面デボーション作成フォーム微調整

開始: 2026-07-04 / 担当: Codex

## 依頼
- JimiのiPhoneスクリーンショットで、デボーション作成画面の上部日付カードと下部公開コントロールが崩れて見えるため微調整する。
- 「配信日」と「予約配信」の両方があり分かりにくい。必要性を見直し、UI上で役割を分かりやすくする。
- 予約配信日は現在より未来の日程しか入力できないようにする。

## 調査結果
- 該当UIは `app/components/admin/DevotionForm.tsx`。
- `配信日` は `devotionDate` で、Todayに表示する対象日。
- `予約配信` は `scheduledAt` で、`saveDevotion` 内の `scheduleDateToIso()` により教会の朝配信時刻へ変換される公開予約日。
- 2つは役割が違うため削除せず、ラベルと補足で違いを明示する方針。
- 現状の公開コントロールは `flex flex-wrap` + 予約日入力 `w-44` のため、モバイルで日付入力・ボタン配置が不揃いになりやすい。

## 確定方針
- `配信日` のラベルを「Todayに表示する日」に変更し、「この日に会員のTodayへ表示されます。」という補足を追加する。
- `予約配信` のラベルを「公開予約日」に変更し、明日以降のみ選べることを補足する。
- 予約配信はUI側で `min` を明日の日付に設定する。
- サーバー側でも `status=scheduled` の `scheduled_at` が現在時刻以前なら保存を拒否する。
- 下部公開コントロールはモバイルでは縦積み、ボタンは整った2列/フル幅のグリッドにする。

## 未完了
- コミット・プッシュ・デプロイは未実施（Jimiから依頼があれば進める）。

## 実装済み
- `app/components/admin/DevotionForm.tsx`
  - `churchTimezone` prop を追加し、教会タイムゾーン基準で予約配信日の `min` を明日以降に設定。
  - 上部フォームカードと公開コントロールに `min-w-0` を追加し、モバイルで入力欄やカードが横にはみ出しにくい構造へ調整。
  - 下部公開コントロールを `flex-wrap` からグリッドへ変更。モバイルでは予約日/下書き/予約/公開が整って積まれる。
  - 予約日が明日より前の場合は「予約する」を無効化し、フィールドをエラー調にする。
- `app/[locale]/admin/[churchSlug]/devotions/new/page.tsx` / `[id]/page.tsx`
  - `church.timezone` を `DevotionForm` へ渡すように変更。
- `app/lib/i18n/messages.ts`
  - `配信日` を `Todayに表示する日`、`予約配信` を `公開予約日` へ変更。
  - 2つの日付の役割を説明する補足文と予約日エラー文を追加。
- `app/lib/db/actions.ts`
  - `saveDevotion` の `scheduled` 保存時、算出された `scheduled_at` が現在時刻以前なら保存を拒否する検証を追加。

## 検証結果
- `git diff --check` PASS。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `npm run test -- tests/unit/i18n.test.ts` PASS（4 tests）。
- `npm run build` PASS。
- 画面確認:
  - `colima start` 後、`supabase start` でローカルSupabaseを復帰。
  - `npm run dev -- --port 3070` を起動し、in-app browser を 393x852 のモバイル幅にして `/ja/admin/eifuku-minami/devotions/new` を確認。
  - 上部カードは `docScrollWidth=393` / `innerWidth=393` で横溢れ 0。カード幅は 361px でビューポート内に収まる。
  - 下部公開コントロールも横溢れ 0。予約日入力 319px、下書き保存 319px、予約/公開ボタン各 156px で整列。
  - `公開予約日` の `min` は `2026-07-05`（2026-07-04 JST時点の明日）になっている。
  - 予約日に `2026-07-05` を入力すると `予約する` が有効化。
  - `2026-07-04` を入れた場合は input validity が false、`予約する` は無効、エラー補足「予約配信は明日以降の日付を選んでください。」が表示。
  - date input のブラウザ差を避けるため、`onChange` に加えて `onInput` でも日付状態を拾うよう補強済み。
- 確認後、in-app browser の viewport override は reset 済み。開発サーバーは停止済み。

---

# 現在のHANDOFF — Today祈祷カード初期表示修正

開始: 2026-07-04 / 担当: Codex

## 依頼
- Todayの5件の祈祷課題カードで、最初に完了カードが表示されてしまう。
- 初期表示は必ず `1 / 5` の祈祷課題カードにする。

## 原因
- `app/components/member/TodayPrayerCarousel.tsx` が `viewerPrayed` をもとに「完了済みか」を判定していた。
- 5件すべて `viewerPrayed=true` の日や再訪時に、DB上の「祈った記録あり」を「この画面で5件を最後まで進めた」と同一視してしまい、初期表示から完了カードに寄っていた。

## 実装済み
- `TodayPrayerCarousel` の初期 `index` を常に `0` に変更。
- DB上の祈祷済み状態とは別に `sessionComplete` state を追加。
- 完了カードは、ユーザーがこの表示セッションで最後のカードまで進めたときだけ表示するよう変更。
- 既に祈っているカードでは従来どおり `toggleReaction` を呼ばず、`祈りました` で次へ進む。
- `tests/unit/today-prayer-carousel.test.tsx` を更新。
  - 既に祈った1件でも初期状態では `さらに祈る` を表示せず、クリック後に完了カードへ進むことを確認。
  - 5件すべて `viewerPrayed=true` でも初期表示が `1 / 5` であることを確認。

## 検証結果
- `npm run test -- tests/unit/today-prayer-carousel.test.tsx` PASS（3 tests）。
- `npm run typecheck` PASS。
- `npm run lint` PASS。
- `git diff --check` PASS。
- `npm run build` PASS。
- ローカルdev server `http://localhost:3070` でブラウザ確認:
  - `http://localhost:3070/ja/church/eifuku-minami/today?replayTodayAnimation=1&carouselStartCheck=1` をモバイル幅 393x852 で確認。
  - スクロールで `今日の祈り` セクションを表示した時点で、完了カードではなく `1 / 5` の祈祷課題カードと `祈りました` ボタンが出ることを確認。
  - `今日、共に覚えて祈りました。` は初期表示では出ていない。
- 確認後、in-app browser の viewport override は reset 済み。開発サーバーは停止済み。

## 未完了
- コミット・プッシュ・デプロイは未実施（Jimiから依頼があれば進める）。

---

# 過去HANDOFF — Semeron パイロットFB対応（応答編集＋匿名漏洩）

対象リポ: /Users/james/syncthing/semeron （main, HEAD=815141a, tree clean）
セッション開始: 2026-07-03 / 担当: Claude Code (Opus)

## 依頼（JimiのパイロットFB）
1. 投稿した「応答（reflection）」を投稿者が後から編集できるようにする。
2. 匿名で投稿した「祈祷課題（prayer_request）」が匿名になっていない → プライバシー/セキュリティ最優先で堅牢に。

## 確定した診断（FB#2 の根本原因）★証拠あり・再現済み
- 匿名性が **二重エンコード**されている: `content_items.anonymous`(bool) と `visibility='anonymous_church'`。
  マスク用ビュー `content_feed` は「`anonymous_church` OR `anonymous`」で作者を隠す（`security_invoker`）。
- フォーム(`PrayerRequestForm.tsx`)は「公開範囲カードの anonymous_church」と「anonymousトグル」が**別物**。
  ユーザーが anonymous_church を選び、トグルを押さないと `anonymous=false` のまま。
- モデレーション(`ModerationCard.tsx`+`moderate_prayer` RPC)は公開範囲を**変更できる**。`recommend()`は
  broad+sensitive を `prayer_team` に自動推奨。→ 承認時に `anonymous_church`→他visibilityへ変わると
  `anonymous=false` のためマスクが外れ、**作者が露出**する。
- 再現（ローカルDB, 全ROLLBACK / repro は scratchpad/repro_anon_leak.sql）:
  - A) 承認直後(anon_church,anonymous=false): 一般会員に作者=NULL（マスク）✓
  - B) visibility を church に変更後: 一般会員に **実author_membership_id が見える = 漏洩(is_leak=t)** ❌
  - C) 対照 church+anonymous=true: マスクされ NULL ✓（＝anonymousフラグは守る）
  - prayer_team へ変更→ prayer_team員(ken)に作者露出も確認。
- 参考: `requested_visibility` は投稿時の希望を保持している（＝当初の匿名意図の復元に使える）。
  Phase1仕様 `app/lib/demo/visibility.ts::isAuthorVisibleTo` = 「匿名は admin/moderator には見せる」設計。

## 追加で気づいた点
- 自分の匿名投稿は `content_feed` が本人には作者を返す→ `PrayerCard` が本人の実名＋「自分の投稿」を表示。
  投稿者から見ると「匿名なのに名前が出てる」と誤解しうる（他者には匿名でも）。＝信頼性/表示の問題。
- `PrayerRequestForm` の `pastorConsult` トグルはサーバへ送られていない（死にstate。軽微）。
- 応答(reflection)編集は RLS 上すでに作者更新可（content_update: type=reflection の carve-out）。
  → DB変更不要。server action + 編集UI + ReflectionVM に isMine/body を足すだけ。

## 未決（Jimiに確認する）
- Q1 匿名の可視範囲: 牧師・役員（admin）/祈祷チームに実名を見せるか（現状=見せる）。
- Q2 編集の範囲: 応答のみ（要望どおり）か、祈祷課題も編集/取り下げ可にするか。

## 実装方針（Q確定後に着手／匿名の芯は回答に依らず必要）
1. 匿名を sticky・単一の真実に: 投稿時 `anonymous = toggle || visibility==='anonymous_church'` を必ず立てる
   （server action `submitPrayerRequest`）＋ DBトリガで anon_church なら anonymous=true 強制／true→false降格禁止。
2. 既存データ backfill migration: `type='prayer_request' AND (visibility='anonymous_church' OR
   requested_visibility='anonymous_church') AND anonymous=false → anonymous=true`（希望から復元）。
3. マスクビューは Q1 の回答で admin carve-out を調整。
4. PrayerCard: 本人の匿名投稿に「あなた（匿名で投稿）」表示＋他者には匿名で出る旨の一言。
5. 応答編集: `updateReflection` action + ReflectionCard 編集UI（isMine時）+「編集済み」表示。
6. 実装後: pgTAP に匿名sticky/再スコープ回帰テスト追加 → `npm run db:test` → 敵対的 RLS 監査(skill)。

## Jimi 決定（2026-07-03）
- Q1 = **完全匿名**: 一般会員だけでなく牧師・役員・祈祷チームにも作者を画面に出さない（DBは帰属保持）。
- Q2 = 応答編集に加え、**祈祷課題の編集/取り下げも追加**。

## 実装済み（コミット前・working tree）
DBマイグレ `supabase/migrations/20260703120000_prayer_anonymity_hardening.sql`:
  - `private.enforce_prayer_anonymity()` トリガ: anon_church希望なら anonymous=true 強制／true→false降格禁止。
  - backfill: `requested_visibility|visibility=anonymous_church` の既存投稿を anonymous=true に復元。
  - `content_feed` を完全匿名化（admin carve-out 削除 = 作者本人以外に作者を出さない）。
コード:
  - `app/lib/demo/visibility.ts::isAuthorVisibleTo` を完全匿名へ（作者本人のみ）。
  - `actions.ts`: submitPrayerRequest で anonymous を sticky 化。+ updateReflection / updatePrayerRequest（公開済み編集は再審査）/ withdrawPrayerRequest 追加。
  - `queries.ts`: getModerationQueue を content_feed 経由に（モデレーターにも匿名作者を出さない）+ locale 引数。ReflectionVM に isMine 追加。
  - UI: `ReflectionEditor.tsx`(新)・`MyPrayerActions.tsx`(新)・PrayerCard(自分の匿名投稿に「あなた（匿名で投稿）」＋牧師にも非表示の注記＋編集/取り下げ)・ReflectionCard(編集)・ModerationCard(コメント修正)。
  - i18n: prayer.*/reflection.* を ja/en で追加。
テスト: `supabase/tests/rls_anonymity.test.sql`(新, 9) + `rls_content_visibility.test.sql`(admin→非表示に修正) + `tests/unit/visibility.test.ts` 更新。

## 検証結果（実施済み）
- `npm run db:reset` OK（新マイグレ適用）。
- `npm run db:test` = **PASS**（Files=5, Tests=93、匿名再現テスト含む）。
- `npm run typecheck` = PASS。`eslint`(変更ファイル) = 0。`npm run build` = 成功。
- ⚠ `npm run test`(vitest) は **環境要因で起動不可**（ERR_REQUIRE_ESM / std-env、node20+vitest4。configもdepsも未変更＝既存の問題）。
  visibility.test.ts の内容は pgTAP と一致させて更新済み。i18n新キーは ja/en 両方確認済み。

## 追加で発見・修正した2つの深い漏洩（敵対的監査）
1. **基底表の直接読み**（重大）: content_items は authenticated に SELECT 許可＋RLSは行単位で
   列を守らない → 会員が REST で `content_items.author_membership_id` を直接読めた（ビュー迂回で匿名解除）。
   → 対策: author列を authenticated から**列レベルで revoke**。作者露出は `private.feed_author()`
   (definer, 完全匿名判定) 経由の content_feed のみ。所有権判定は `public.owns_content()` definer。
   devotion読取4本を content_feed へ振替。**再現→修正を psql で実証**（直読み=permission denied）。
2. **通知経由の逆引き**: notifications は recipient(=承認通知では作者)＋data.content_item_id を持ち、
   `notifications_select` が管理者に全通知を許していた → 管理者が content_id で作者を逆引き可能だった。
   → 対策: notifications_select を**受信者本人のみ**に限定。管理運用画面は受信者/内容連結を含まない
   `public.church_notification_ops()` definer RPC 経由に振替。**再現→修正を psql で実証**。

安全確認済みで対処不要: pastor-assist(作者列を選ばない)・notification_data/target(作者無)・
CSV取込(現状プレビューのみで書込なし)・demo mode(isAuthorVisibleToで一貫)・group prayers(content_feed)。

## 最終検証（すべて実施・合格）
- pgTAP **97 tests PASS**（rls_anonymity=13: sticky/再スコープ/完全匿名/列レベル拒否/通知逆引き封じ）。
- typecheck / eslint(変更ファイル) / `next build` すべて成功。db:types 再生成済み。
- **ブラウザE2E（emiでログイン→本番同等フロー）**:
  - 公開範囲カードで「匿名で教会全体」を選び匿名トグル未操作 → DB `anonymous=t`（sticky実証）。
  - 自分の匿名投稿カードに「あなた（匿名で投稿）」＋「牧師や役員にも名前は表示されません」表示。
  - 祈祷課題 編集→本文更新・匿名保持、取り下げ→削除、応答 編集→本文更新・published維持・「編集済み」。
  - 他会員(emi)視点で seed 匿名投稿の作者は「匿名」表示（feed_author マスク実証、screenshot取得）。

## 出荷済み（2026-07-03）★完了
- **コミット** `366ab94`（main）→ push 済み。
- **本番DB適用済み**: `supabase db push --linked` で migration 20260703120000 適用。
  `migration list` で remote 記録を確認（原子的commit）。pg-delta証明書エラーは無害（既知）。
- **本番SQL実体確認（supabase db query --linked）すべて期待どおり**:
  author列 authenticated 読取=**false**／body列=true／新関数=**3**／匿名トリガ=**1**／
  content_feedがfeed_author使用=**true**／notifications_selectにadmin=**false**／未backfill=**0**。
- **本番デプロイ**: Vercel dpl (sha 366ab944) = **READY / production**。prod URL 200/307。
  順序: 先にDB適用→即push（migrate-first。会員の祈りフィードは無停止、devotion/moderationのみ
  ~40s degrade の想定窓、新appデプロイで解消）。
- vitest は環境要因で起動不可（既存問題・本変更と無関係）。visibility.test.ts は pgTAP と整合。

## 残（任意）
- 本番の認証付きスモーク（Jimi実アカウントでの目視）。DB層は本番SQLで実証済み・ロジックはlocalとE2E一致。
- get_advisors は Supabase MCP が別アカウント認証のため未実行（変更は制約追加のみで新規穴なし）。

## 変更してはいけない確定事項
- 匿名は `anonymous` フラグを単一の真実にする（sticky・降格不可）。二重エンコードへ戻さない。
- 作者名は content_feed / feed_author 経由のみ（マスク後）。content_items.author を authenticated で直読みしない（列revoke維持）。
- notifications は受信者本人のみ閲覧。管理運用は church_notification_ops(redacted) 経由。
