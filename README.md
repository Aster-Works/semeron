# Semeron

> 教会の毎日を、みことばと祈りでつなぐ。
> A daily rhythm of Scripture, prayer, and shared life for your church.

**Semeron** は、教会員が毎日 **みことば → 牧師の短い導き → 黙想の問い → 祈り → Read/Prayed → 短い応答 → 教会の祈祷課題** の順に向かうための、教会単位の **デボーション・祈りリズム PWA** です。総合教会アプリでも、Christian SNS でも、AI デボーション玩具でもありません。将来の `Aster Church` に統合される `Daily / Rhythm` モジュールとして設計しています。

これは **Phase 1（デモ UI）** の実装です。決定論的なデモデータで動作し、本物のプロダクトのように見えますが、まだ Supabase 連携はありません（Phase 2 以降）。

設計文書: `JimiVault/02_Area/個人/Aster Works/Aster Daily/`（01_PRD 〜 08_AI Prompt Pack）。

---

## クイックスタート

```bash
npm install
npm run dev          # http://localhost:3070 → /ja → 永福南の「今日」へ
```

その他:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest（可視性ロジック + i18n 完全性）
npm run build        # 本番ビルド
```

## 技術スタック

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4**（`@theme` トークン、装飾グラデーションなし）
- **lucide-react** アイコン
- 軽量な **ローカル i18n 辞書**（ja / en。`next-intl` は使わず、URL の `[locale]` が正典）
- **PWA**（manifest + アイコン + 最小 Service Worker。本番のみ登録）
- **Vitest**（純関数テスト）

## デモの歩き方

- 入口は **マーケLPではなく「今日のみことば」**（`/ja/church/eifuku-minami/today`）。
- 画面上部の **デモバー**（点線・ラボアイコン）で、**視点（ペルソナ）／教会／会員↔管理／言語** を切り替えられます。
- 視点を変えると、**公開範囲（RLS 相当）による見え方の違い**を体感できます。例:
  - 一般会員（山田太郎）では、承認待ちのセンシティブな祈祷課題や `牧師のみ` の課題は見えません。
  - 牧師（Jimi）／祈祷チーム（高橋健）では、モデレーションキューや広い範囲の課題が見えます。
  - `匿名で教会全体` の課題は、一般会員には投稿者が「匿名」と表示され、管理者には実名が見えます。
- 2 つの教会（**永福南キリスト教会** / **Grace Community Church**）でマルチテナントを示しています。片方の会員はもう片方のデータを一切閲覧できません。

## 実装済みの画面（Phase 1）

会員（スマホファースト、下部タブ）:

- **今日 (Today)** — 3 状態（配信あり / 完了後 / 未配信）、ソフトゲート、Read/Prayed、応答入力
- **祈り (Prayer)** — フィード（可視性バッジ付き）／投稿フォーム（公開範囲必須・センシティブ警告・広域確認モーダル）
- **グループ (Groups)** — 一覧／詳細（グループ限定の祈祷課題）
- **受信 (Inbox)** — 静かな祈りのリマインダー
- **自分 (Me)** — 役割・所属・言語切替
- ヘッダー右上の**歯車 →「設定」** — 表示言語(ja/en)、管理⇄会員の切替（管理権限がある人だけ）

管理（デスクトップフレンドリー、サイドバー）:

- **ダッシュボード** — 今日の状態／承認待ち／**匿名集計**（個人別・信仰スコアは出さない）／公開範囲別件数／通知失敗
- **デボーション** — 一覧／エディタ（**配信言語は教会ごとにカスタム**：既定は主言語1つ、カタログ（日本語/English/한국어/中文/Español/… ）から自由に追加。会員プレビュー・予約/公開）
- **祈祷課題** — モデレーションキュー（希望↔推奨の公開範囲・本文編集・判断メモ）／**CSV取り込み**（`title,body,visibility,author_name,anonymous,expires_at,sensitive_flags`。取り込みは必ず承認待ち＋狭い既定範囲、公開前レビュー必須。サンプル: `public/samples/prayer-requests-sample.csv`）
- **グループ / メンバー / 通知 / 設定**

**配信の優先**は会員の祈祷課題。デボーションは牧師が配信したときだけ表示（未配信でも「今日」は成立）。

**UIアセット（画面言語）は常に ja/en**。一方で**コンテンツの配信言語は教会ごとに自由にカスタム**（`Church.contentLanguages`、設定＞配信言語で追加/削除）。既定は主言語1つで、`app/lib/i18n/languages.ts` のカタログから任意の言語を追加できる（例: デモの Grace は English + Español、永福南は日本語のみ）。`Localized` は `{ja,en}` 固定から言語コードマップに一般化済み。

**Pastor Assist（AI）は Phase 1 では無効プレースホルダ**で、`Publish` とは視覚的に分離しています。AI が自動配信することはありません。

## セキュリティ・プライバシー設計（Phase 1 の中核）

祈祷課題は要配慮情報（健康・家庭・経済・信仰・未成年）を含み得るため、可視性ロジックを **純関数として一元化**し、全画面がそれを通してフィルタします（`app/lib/demo/visibility.ts`）。Phase 2 で **Supabase RLS** に置き換える前提の「安全設計の中核」です。

- 教会分離（`church_id`）／User と Member の分離
- 公開範囲: `pastor_only / elders / prayer_team / group / church / anonymous_church`
- 状態: `draft / scheduled / pending_review / published / rejected / archived`
- 承認前（pending_review）は投稿者 + レビュアーのみ／却下は通常会員に決して表示しない
- 期限切れは会員一覧から消える（管理者は監査のため閲覧可）
- 完了ログは本人のみ／管理者には匿名集計のみ

これらは `tests/unit/visibility.test.ts` が 04 §10 の Security Test Cases として検証します。

## ディレクトリ

```
app/
  [locale]/                     ja/en ルート
    church/[churchSlug]/…        会員 PWA（today / prayers / groups / inbox / me）
    admin/[churchSlug]/…         管理（dashboard / devotions / prayer-requests / …）
    login, join/[inviteCode]     デモ入口・招待
  components/
    ui/                          デザインシステム（Card, Button, Badge, VisibilityBadge, …）
    member/ admin/ demo/ pwa/    画面別コンポーネント
  lib/
    demo/                        types / data（決定論的シード）/ selectors / visibility
    i18n/                        messages(ja/en) / provider / helpers
    utils.ts
  manifest.ts, icon.svg          PWA
public/
  sw.js, icons/                  Service Worker・アイコン
tests/unit/                      visibility / i18n
```

## 既知の制約（Phase 1）

- 本物の認証・DB はまだありません（デモは決定論的データ）。書き込み操作（送信・承認・保存）は UI 上で完結する擬似挙動です。
- PWA アイコンは SVG のプレースホルダ（後で raster を追加）。
- オフラインは「一度開いた今日」が読める程度（完全対応は Phase 4）。

## Phase 2 — Supabase スキーマ + RLS（ローカル）

DB 層の「安全設計」を実コードに落としたもの。`supabase/` にローカル移行を用意しています（hosted プロジェクトはまだ作りません）。

```
supabase/
  config.toml
  migrations/
    …_core_tables.sql              13 コアテーブル（多言語は jsonb、content_languages）
    …_security_helpers_and_rls.sql private スキーマの認可ヘルパー + 全テーブル RLS +
                                    can_view_content() + content_feed(匿名マスク) + 集計関数
    …_integrity_triggers.sql       教会境界の整合性トリガー（越境書き込み防止）
  seed.sql                          2教会分のデモデータ
  tests/
    rls_isolation.test.sql          教会分離・承認制・匿名拒否（16 assertions）
    rls_content_visibility.test.sql 可視性マトリクス（32 assertions）
```

実行（Docker/Supabase CLI が必要。ローカルポートは **546xx**＝keryx(543xx)/synaxis(545xx) と共存。Studio は http://127.0.0.1:54623）:

```bash
npm run db:start   # supabase start（ローカルスタック起動）
npm run db:reset   # migrations + seed 適用
npm run db:test    # pgTAP テスト（= supabase test db）→ ✅ 49 assertions PASS
npm run db:types   # 生成型 → app/lib/database.types.ts（925行 / 14 Row 型）
```

> ローカルでは `storage` と `analytics(vector)` を無効化しています（RLS 検証に不要・重い。画像アップロードが要る Phase で `supabase/config.toml` で有効化）。

RLS の核心:

- 認可は `membership_roles` を正とし、`private` スキーマの `security definer`（`search_path=''`）ヘルパーで判定（RLS 再帰を回避）。
- 可視性は `private.can_view_content()` に一元化（04 §4/§5 を DB 側で実装。Phase 1 の `visibility.ts` と同じ規則）。
- **承認制を DB で担保**: 一般会員は `draft/pending_review` しか作れず、`published` への遷移（承認）はモデレータ/管理者のみ（自己公開・自己承認を RLS で禁止）。
- 匿名は `content_feed`（`security_invoker` ビュー）で投稿者をマスク（管理者・本人には見せる）。
- 完了ログは本人のみ。管理者は `devotion_completion_counts()` で匿名の「数」だけ取得。
- 教会境界の整合性はトリガーで担保（子テーブルの `church_id` は親と一致、`group_id` は同一教会）。

> Phase 2 の SQL は敵対的レビュー（3次元）で検証し、2件の HIGH（自己公開/自己承認の抜け穴・越境整合性）を含む指摘を修正済み。**ローカル Supabase で `db:reset` + `db:test` を実際に実行し、49 の pgTAP アサーションが全て PASS**（教会分離・承認制・匿名マスク・完了ログ本人限定・可視性マトリクス・admin≠moderator ほか）。生成型も取得済み。

## Phase 3 — 実 Supabase 接続（実認証・実データ）

デモデータ層を実 Supabase に置き換え。`@supabase/ssr` による**メール+パスワード認証**（サインイン/新規登録。マジックリンクは当初実装したが廃止済み・パスワードのみ）、教会作成・招待コード参加（RPC）、デボーション CRUD、祈祷課題の投稿→承認待ち→承認/却下（監査ログ付き）、Read/Prayed 完了ログ、実データのダッシュボード。DemoBar は廃止し、実ユーザーのヘッダ（教会名＋歯車→設定/サインアウト）に。

```
app/lib/supabase/   browser / server / admin(service role) client + middleware
app/lib/db/         map(行→ドメイン) / context(requireChurchContext) / queries / actions(server actions)

supabase/migrations/…_rpcs.sql  create_church / join_church / moderate_prayer
```

- 環境変数は `.env.local`（`supabase status` の値。`SUPABASE_SERVICE_ROLE_KEY` はサーバー専用）。
- ローカル検証: `npm run db:start` の後 `npm run dev`（:3070）。seed のユーザーは全員 **password123** でログイン可（例: `jimi@eifuku.example`＝牧師 / `taro@eifuku.example`＝会員）。
- 安全: service role はクライアントに出さない。server action は RLS + `requireChurchContext` で権限を再確認。承認/却下は監査ログに残る。会員の自己公開/自己承認は RLS が拒否。
- **実機E2E検証済**: ログイン→自教会 Today（実データ・匿名は管理者にのみ作者表示）→「祈りました」が永続。lint / typecheck / build / unit 18 / RLS 49 すべて green。

## Phase 4 — 通知 + PWA（イベント駆動の通知 / Web Push / インストール）

「受信箱」を実際の出来事から満たす。祈祷課題の**承認/却下**、**祈られた**とき、**デボーション公開**の瞬間に、DB トリガーが受信者宛の in-app 通知を自動生成する（`private.*` の `security definer` トリガー＝RLS を跨いで受信者行を作る）。in-app 通知を「唯一の真実」とし、cron ディスパッチャが購読デバイスへ Web Push で配信する。

```
supabase/migrations/…_notifications.sql   通知トリガー3種 + push_subscriptions(RLS)
app/lib/notifications/providers.ts        Web Push(VAPID) / Email(Resend) 抽象。すべて env ゲート
app/lib/notifications/dispatch.ts         queued in-app → 購読へ配信 + 予約公開の昇格
app/api/notifications/dispatch/route.ts   cron エンドポイント（CRON_SECRET で保護）
app/lib/push/client.ts                    ブラウザ購読ヘルパー（iOS/未対応を graceful に）
app/components/member/NotificationSettings.tsx / InstallPrompt.tsx  「自分」画面のUI
public/sw.js                              push / notificationclick ハンドラ（v2）
vercel.json                               crons: /api/notifications/dispatch を10分毎
```

設計の要点:

- **通知はイベント駆動**（トリガー）。in-app は `notifications`（status 既定 `queued`）に入り、受信箱は status に関わらず表示。
- **ディスパッチャ**は queued の in-app を各受信者の `push_subscriptions` へ Web Push 送信し、`sent`/`skipped`(購読なし・未設定)/`failed`(全滅)へ更新。失効購読(410/404)は削除。**Push 未設定でも 200 を返しコアを絶対にブロックしない**（03 §7）。
- **Daily devotion notification job**: cron が `scheduled_at` 到来のコンテンツを `published` に昇格 → 公開トリガーが会員全員へ in-app 通知を生成 → 同じ実行で配信。
- **プロバイダは env ゲート**: VAPID 未設定なら Push 無効、`RESEND_API_KEY` 未設定なら Email 無効（いずれも例外を投げず「無効」を返すだけ）。鍵は `.env.local`（`NEXT_PUBLIC_VAPID_PUBLIC_KEY` のみ公開、private/`CRON_SECRET`/`RESEND_API_KEY` はサーバー専用）。
- **iOS**: ホーム画面追加 + iOS16.4+ が Push の前提。未対応端末・権限拒否は「自分」画面で静かに案内し、受信箱には常に届く（in-app フォールバック）。

ローカル検証（実施済み・2026-07-02）:

- **トリガー**: 承認→`prayer_request_approved` / 却下→`prayer_request_rejected` / 祈られた→`prayer_request_prayed` / デボーション公開→会員全員へ `daily_devotion_published`。SQL で各生成をロールバック確認。RLS 49 テストは維持。
- **ディスパッチ**: 未認証=401、認証=queued を処理。購読なし→`skipped(no_subscription)`、擬似購読→送信を試行し `failed(all_endpoints_failed)`（コアは無停止）を確認。`pushConfigured:true`。
- **実機ブラウザ**: 会員（山田太郎）でログイン→受信箱に「今日のみことばが届きました／山に向かって目を上げる」「あなたの祈祷課題が覚えられています」が実データで表示（生 enum ではなく多言語タイトル）。未読バッジ2。「自分」画面に通知設定・ホーム画面追加が表示（権限拒否時の graceful 表示を確認）。console エラーなし。
- **quality gate**: lint / typecheck 0 / build（`/api/notifications/dispatch` を含む）/ unit 18 / RLS 49 すべて green。

> 本番の実配信（実デバイスへの OS 通知）には Jimi の実 VAPID 鍵＋実端末が必要（cron は Vercel の `crons` が `CRON_SECRET` を Bearer 付与して起動）。ローカルでは送信の「試行と失敗処理」までを検証済み。

## Phase 5 — Pastor Assist（管理者限定 AI・必ず人間レビュー）

牧師・管理者の**下書き／確認**を助ける AI。**AIは牧会的権威ではなく、下書きと提案だけを返す。** 自動配信せず、保存・承認・公開はすべて人間の別操作。プロンプトと API キーはサーバー専用（`import "server-only"`）。既定は無効（教会ごとに opt-in）。

```
supabase/migrations/…_pastor_assist.sql   churches に pastor_assist_enabled / allow_prayer_ai（既定 false）
app/lib/pastor-assist/prompts.ts          08 の Global System Prompt（原文）+ 各タスクのプロンプト builder。server-only
app/lib/pastor-assist/client.ts           Anthropic SDK ラッパ。env ゲート（ANTHROPIC_API_KEY）
app/lib/pastor-assist/redact.ts           送信前に会員名を既定リダクション（純関数）
app/lib/pastor-assist/parse.ts            モデル応答から JSON を頑健に抽出（純関数）
app/lib/pastor-assist/actions.ts          assistDevotionDraft（管理者）/ runPrayerAssist（モデレータ）。"use server"
app/components/admin/PastorAssistPanel.tsx        デボーション: 箇所から下書き / 黙想の問い / 翻訳
app/components/admin/PrayerAssistPanel.tsx        祈祷: センシティブ確認（送信前に明示確認）
app/components/admin/PastorAssistSettingsEditor.tsx  設定トグル（owner/pastor のみ）
```

安全設計（07 Phase 5 / 08 §11-13）:

- **自動配信しない**: AI 出力は下書きのみ。デボーションは `onApplyDraft` でフォーム状態へ**マージ**するだけ（置換せず既存編集を保つ）、保存は別途 Draft/Schedule/Publish のクリック。祈祷は提案（リスク度・フラグ・より安全な公開範囲・要約案）を出すだけで、承認/却下は人間が決める。
- **祈祷本文の AI 送信は二重同意 + 明示確認**: `pastor_assist_enabled` かつ `allow_prayer_ai`（要配慮情報のため別トグル・既定 false）が有効で、モデレータが確認モーダルで承認したときだけ送信。本文は id から**サーバー側で再取得**し、`.eq("church_id", viewer.church.id)` で**自教会に限定**（越境同意バイパス防止）。送信前に**会員名を既定でリダクション**。
- **サーバー側で権限を再確認**: デボーション補助=管理者、祈祷確認=モデレータを `resolveChurchContext` + ロールヘルパーで再判定（クライアントの UI ゲートは信用しない）。設定変更は `churches_update` RLS で owner/pastor 限定。
- **プロンプト・鍵はサーバー専用**: `server-only` import。クライアントに露出しない（client component は `"use server"` アクションのみ参照）。
- **監査**: AI 利用は `audit_logs` に記録（本文・名前は残さず、種別・モデル・トークン数・リスク度・件数のみ）。挿入失敗はサーバーログに必ず残す。
- **危機対応**: 自傷・虐待・急病等を示唆する内容は `risk_level=urgent`・公開要約を作らず、即時の牧会的対応と地域の緊急窓口を促す（08 §10）。
- **env ゲート**: `ANTHROPIC_API_KEY` 未設定なら生成は行わず「未設定」を穏やかに返す（設定は保存可、パネルは disabled 表示）。既定モデル `claude-sonnet-5`（`PASTOR_ASSIST_MODEL` で上書き可）。

ローカル検証（実施済み・2026-07-02）:

- **設定トグル**: 牧師でログイン→設定で Pastor Assist / 祈祷AI送信を ON → DB の `churches` に永続（RLS で owner/pastor のみ）。
- **デボーション**: パネルが対話化。箇所未入力→「先に聖書箇所を…」、入力後→（鍵未設定のため）「AIは未設定です」を穏やかに表示（無停止）。
- **祈祷**: `allow_prayer_ai` ON でパネル表示→「AIで確認する」→**送信前の確認モーダル**→承認→（鍵未設定で）graceful に「未設定」。console エラーなし。未設定時は監査行を作らない（実 AI 利用時のみ記録）。
- **敵対的セキュリティレビュー**（6 レンズ×反証検証、8 エージェント）で 2 件を検出・修正: (1) HIGH＝**越境同意バイパス**（`runPrayerAssist` の同意判定は slug の教会だが本文は id だけで取得していた）→ 自教会に限定するフィルタ+明示チェックを追加。(2) MEDIUM＝監査挿入エラーの握り潰し→ 失敗をサーバーログに surface。
- **quality gate**: lint / typecheck 0 / build / **unit 31**（Pastor Assist の redaction・JSON 抽出を追加）/ **RLS 49** すべて green。

> 実生成には Jimi の実 `ANTHROPIC_API_KEY` が必要。ローカルでは「ゲート・確認・リダクション・監査・graceful 未設定」までを検証済み。

## 本番環境（2026-07-02 デプロイ済み）

**https://semeron-app.vercel.app** で稼働中。

| 項目 | 値 |
|---|---|
| Vercel | チーム `asterworks` / プロジェクト `semeron`（Hobby） |
| GitHub | [Aster-Works/semeron](https://github.com/Aster-Works/semeron)（public）→ main への push で自動デプロイ |
| Supabase | プロジェクト `Semeron`（ref `nlbowtgpchzkmzyligic`・東京）。migrations 7本適用済み・seed なし（クリーン） |
| cron | `/api/notifications/dispatch` を毎日 21:30 UTC（=朝6:30 JST）。Hobby は daily 限定（10分毎にするには Pro） |
| 実鍵 | VAPID（本番用に新規生成）+ `CRON_SECRET` 設定済み。`ANTHROPIC_API_KEY` / `RESEND_API_KEY` は未設定（機能は自動オフ、後から Vercel env に追加可） |
| 認証 | **ID+パスワード**（新規登録は即時・メール確認なし=autoconfirm。マジックリンク廃止でメール送信への依存なし）＋ **Google ログイン**（`/auth/v1/settings` を見てプロバイダ有効時のみボタン表示。有効化は Supabase 側で Google クレデンシャル設定→自動で出現）。教会所属は招待コードがゲート |

本番検証済み: ルート→/ja、ログイン画面、PWA manifest / sw.js 配信、cron（未認証401/認証200・pushConfigured:true）、**auth+RPC+RLSのE2E**（一時ユーザーでログイン→教会作成→RLSで自教会のみ→anonのRPC実行は401→掃除済み）。Supabase security advisor は ERROR 0（migration 0007 で anon/public の RPC 実行権を revoke。残る WARN 3件は「認証ユーザーが実行可能」＝設計どおりの意図的な挙動）。

運用フロー: `git push origin main` → Vercel 自動デプロイ。DB変更は `supabase/migrations/` に追加 → `npx supabase db push`。

残タスク（任意）:
- **Google ログイン有効化** → Google Cloud Console で OAuth クライアント（Web）を作成し、承認済みリダイレクト URI に `https://nlbowtgpchzkmzyligic.supabase.co/auth/v1/callback` を登録 → Supabase の Auth > Providers > Google に Client ID / Secret を設定。設定した瞬間、ログイン画面に「Google で続ける」が自動で現れる（コード変更・再デプロイ不要）
- Pastor Assist を本番で使う → Vercel env に `ANTHROPIC_API_KEY` を追加して再デプロイ
- メール通知 → `RESEND_API_KEY` + `NOTIFICATIONS_FROM_EMAIL`
- 独自ドメイン / Vercel Pro（10分毎cron・private repo連携）
- 実端末での Web Push 受信確認（ホーム画面追加 → 自分 > 通知）

---

_Aster Works — Jimi_
