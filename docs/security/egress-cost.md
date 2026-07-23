# Egress・コスト管理

背景: 2026-07 の監査で Supabase Free 枠（Egress 5GB/月）に対し転送量が増大傾向だった。
根本原因は「**上限なしの一覧クエリ**」と「**一覧での長文列の全件転送**」。

## 特定した原因（2026-07 監査）

1. 一覧系クエリ（デボーション・祈祷課題・通知・グループ等）に LIMIT がなく、
   データ蓄積に比例して毎回の転送量が線形増大していた。
2. デボーション一覧が `select("*")` 相当で本文・祈りガイド等の長文 jsonb を全件転送していた
   （一覧 UI はタイトルと日付しか使わないのに）。
3. タブ切替のたびに同じ一覧を再取得（→ `staleTimes` クライアントキャッシュ 30 秒で既に緩和済み）。

## 対策（実装済み）

- `app/lib/db/queries.ts` の一覧系クエリ 7 箇所に **`LIST_CAP = 200`** を適用。
  仕様上も一覧は直近分で足りる（古い分はアーカイブ扱い）。
- デボーション一覧（`getAllDevotions`）は **`DEVOTION_LIST_COLUMNS`**（軽量列のみ）を射影。
  本文は詳細画面（`getDevotion`）でのみ取得。
- 巨大ペイロードの書き込み自体を入力検証で抑制（[rate-limiting-validation.md](rate-limiting-validation.md)）。
- Service Worker は HTML/API をキャッシュしない方針を維持しつつ、`_next/static` は
  ブラウザ/Vercel のハッシュ付きキャッシュに任せる（HANDOFF 2026-07-06 の修正）。

## 運用ルール

- **新しい一覧クエリには必ず `.limit()` を付ける**。無限スクロール等が必要になったら
  ページネーション（range）で足す。「とりあえず全件」は禁止。
- 一覧 UI に出さない長文列（body・prayer_guide・metadata）は射影で除外する。
- 動的 select 文字列は Supabase の型推論が効かない → `as unknown as ContentFeedRow[]` で
  キャストする（`queries.ts` の getAllDevotions 参照）。

## 監視

- Supabase Dashboard → Settings → Usage で Egress を月次確認（無料枠 5GB）。
- 急増時はまず「LIMIT の無い新規クエリが入っていないか」を疑う:
  ```bash
  grep -n "from(\"" app/lib/db/queries.ts | # 各一覧に .limit があるか目視
  grep -c "LIST_CAP" app/lib/db/queries.ts
  ```
