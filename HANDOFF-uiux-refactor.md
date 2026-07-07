# HANDOFF — Semeron UI/UX リファクタリング（7課題）

担当: Claude Code / 開始 2026-07-07。ブランチ: main（未コミット）。dev port 3070。
※ `HANDOFF.md` は Codex の別作業ログ（§11）。混同しない。

## 対象7課題と方針（確定）
1. **デスクトップ幅を少し広く** — `MemberShell.tsx` の `max-w-2xl`→`max-w-3xl`（header/main 2箇所）。AdminShellはmax-w-6xlで対象外。
2. **モバイル日付欄のはみ出し** — 根本原因=iOS Safari の `input[type=date]` が intrinsic min-content 幅で `w-full` を無視。`ui/Field.tsx` の `controlBase` に `min-w-0` 追加（全input/select/textarea＝member pr-expiry・admin DevotionForm 一括修正）。
3. **当日も予約配信可** — `DevotionForm` の `minScheduleDate` を今日に。`saveDevotion`: 予約時刻が既に過ぎた当日ぶんは即時公開へフォールバック（cronは日次で当日昇格不可）。i18n「明日以降」→「今日以降」。
4. **リアクションの記憶** — DB層は既に永続化＆読戻し正常。`ReactionBar` を React19 `useOptimistic` 化しサーバ真値を権威に。※staleTimes 30秒窓は設計トレードで残す。
5. **答えられた祈りのコメント** — migration `mark_prayer_answered`(definer/作者本人/published限定)。action `markPrayerAnswered`。`MyPrayerActions` にモーダル、`PrayerCard` に証しコメント表示。
6. **受信→通知＋既読非表示** — i18n改名。`getInbox` に `.eq("read",false)`。InboxListの「未読」chip削除。
7. **期限切れ課題が残るバグ** — `getPrayerFeed`/`getGroupPrayers` に期限フィルタ（answered/thanksgivingは残す）。

## 進捗
- [x] 全ファイル読解・根本原因特定
- [x] 全7課題 実装完了
- [x] `npm run typecheck` 緑 / `npm run lint` 緑 / `npm run build` 緑（全ルート）
- [x] migration をローカルDBへ適用検証（create+grant成功、security definer）
- [x] `mark_prayer_answered` E2E検証: 不正outcome/not found/非作者=拒否、作者=報告成功(metadata.answered_note+answered_at)、open=証しクリア
- [x] ブラウザE2E目視（dev 3070・seed）:
  - #1 main = max-width:768px 確認
  - #2 mobile(375px) で pr-expiry がはみ出さない（overflowX=false, 入力幅301px）確認
  - #5 taro でモーダル→報告→カードに「答えられました」バッジ＋証しコメント＋「お祈りありがとうございました」表示、ボタン→「報告を編集」化を確認
  - #6 通知見出し・「未読」chip廃止・既読タップで消滅＋nav badge 2→1 を確認
  - #4 ReactionBar/祈りましたボタン描画・ランタイムエラー無し確認
  - 検証で書いた local seed（taro answered / notifications）は**元に戻し済み**
- [ ] vitest は **既存の環境問題**で起動不可（vite8.1.3が要求するNode≥20.19に対しstd-env ESM/CJS不整合）。テスト設定・依存は未変更＝私の変更が原因ではない。
- 未ブラウザ検証: #3当日予約（DBロジック＝build/型で担保）、#7期限フィルタ（seedに期限切れが無いため。標準PostgREST `.or()` 構文・buildで担保）。真のiOS Safari実機での#2は要実機。

## AIサポートを課金アドオン化（2026-07-07 追加）
「AIは有料オプション・無料では使えない」対応。
- migration `20260707140000_ai_addon_entitlement.sql`: churches に `ai_addon_enabled boolean default false`。invokerトリガ `private.enforce_ai_entitlement`= (1)会員(authenticated/anon)は自己付与不可・変更できるのは service_role(課金)/postgres のみ、(2)アドオン未購入なら pastor_assist_enabled/allow_prayer_ai を常にfalse。既存教会backfill。
- `Church.aiAddonEnabled`（types/map/database.types）。
- server: pastor-assist の3アクションに `not_entitled` ゲート追加。`updateChurchSettings` はアドオン未購入でのAI有効化を拒否（"ai add-on required"）。
- UI: `PastorAssistSettingsEditor` に `entitled` prop。未購入=「有料オプション」バッジ＋upsell callout＋トグルロック。settings page が `entitled={church.aiAddonEnabled}` を渡す。i18n `settings.aiAddon*` 追加。
- **課金前の運用**: 支払い教会にはSQL/dashboardで `update churches set ai_addon_enabled=true`（service_role）。将来Stripeがこのフラグを立てる。
- 検証: typecheck/lint/build緑・**test 69/69**・DB不変条件（[A]オーナー自己付与→f/f/f、[B]課金付与後オーナー有効化→t/t/f）・ブラウザ（未購入=upsell+ロック、購入=解除）。

## 通知の当日既読表示＋ソフトゲート削除（2026-07-07 追加）
- **通知**: `getInbox` を「未読は常に表示＋既読は当日分(教会TZ)のみ表示継続」に変更（`.or("read.eq.false,created_at.gte.<今日0時ISO>")`）。`startOfDayIso`(action-helpers)追加。翌日で既読は消える・未読は残る。badge(getUnreadInboxCount)は未読数のまま。ブラウザ検証: 当日既読=残る、過去既読=消える、を実測。
- **ソフトゲート削除**: 実質デッド設定（保存されるだけで挙動不変・Today仕切りは固定文言）を全撤去。types(SoftGateMode/softGateMode)/map/actions(input/patch/select/SOFT_GATE_MODES)/ChurchBasicsEditor(選択UI)/settings page/TodayDevotionFlow(仕切り)/i18n(settings.softGate*・today.softGate.gentle)/demo data/database.types(5箇所)/tests(5 fixture)/seed から削除。migration `20260707160000_drop_soft_gate` で列drop。**DROPのためデプロイはapp先行→migration後行**。
- 検証: typecheck/lint/build緑・test 69/69・ローカルでdrop適用済。

## デプロイ（完了 2026-07-07）
- コミット: 399dd97（7課題）→ 181dbe9（テスト更新+.nvmrc）→ 5b0f083（anon EXECUTE剥奪）。main へ push 済み。
- 本番Supabase(Semeron nlbowtgpchzkmzyligic): migration `20260707120000` 適用済み。SQL実体確認=関数存在・security definer・ACL={authenticated,service_role}のみ（anon無し）。security advisor ERROR **0**。pg-delta証明書warningは無害。
- Vercel: dpl_E6uHc8Jw…（commit 5b0f083, production）**READY**、`semeron-app.vercel.app` login/manifest **200**。ビルド~40s。
- 安全順序を遵守: **DB migration先行 → app push**（RPC未定義で機能が壊れる窓を作らない）。
- テスト環境: Node **22.23.1**（nvm）で `npm run test` = **69/69 green**。ローカル既定node 20.18は不足（.nvmrcで固定）。

## 変更ファイル
- `app/components/member/MemberShell.tsx`（#1 max-w-3xl）
- `app/components/ui/Field.tsx`（#2 controlBase min-w-0）
- `app/components/admin/DevotionForm.tsx` + `app/lib/db/actions.ts saveDevotion`（#3 当日予約＋即時公開フォールバック）
- `app/components/member/ReactionBar.tsx`（#4 useOptimistic）
- `supabase/migrations/20260707120000_prayer_answered_testimony.sql` + `actions.ts markPrayerAnswered` + `database.types.ts` + `MyPrayerActions.tsx` + `PrayerCard.tsx`（#5）
- `app/lib/db/queries.ts getInbox`（#6 read=false）+ `InboxList.tsx`（unread chip削除）+ `messages.ts`（受信→通知）
- `app/lib/db/queries.ts getPrayerFeed/getGroupPrayers`（#7 期限フィルタ）
- `messages.ts`（#3文言・#5新規キー）

## 変更禁止（確定）
- 匿名不変条件（author列剥奪・feed_author経由・notifications_select受信者のみ）。answered機能はmetadata経由で作者名を露出しない。
- migrationタイムスタンプ衝突回避（新規=20260707120000_）。

## 検証条件
`npm run typecheck` && `npm run build` 緑・既存vitest緑。
