# インシデント対応・バックアップ/リストア

## 連絡先・管理面

- Supabase: プロジェクト `Semeron`（ref nlbowtgpchzkmzyligic・東京）
- Vercel: team asterworks / semeron（main push で自動デプロイ）
- 正式管理アカウント: jimiaki7@gmail.com（owner+pastor）

## バックアップ（Free プランは自動バックアップなし＝自前で取る）

```bash
scripts/backup-db.sh          # スキーマ+データを backups/ に日付付きで保存（直近14世代保持）
```

- 実行には Supabase CLI・`SUPABASE_DB_PASSWORD`（環境変数または Keychain）が必要。
  スクリプト冒頭のコメント参照。**パスワードをリポジトリに書かない。**
- 推奨頻度: 週1回＋大きな migration の直前は必ず。cron 化するなら launchd で
  `backup-db.sh` を呼ぶだけ（無人実行の記録は backups/ のファイル自体が証跡）。

## リストア手順（訓練してから本番でやる）

1. 新しい Supabase プロジェクト（または復旧対象）に対して:
   ```bash
   psql "$DB_URL" -f backups/<日付>-schema.sql
   psql "$DB_URL" -f backups/<日付>-data.sql
   ```
2. `supabase migration list --linked` で migration 履歴と実体の整合を確認。
3. env（URL/keys）を Vercel に反映 → 再デプロイ → ログイン・投稿の疎通確認。

## インシデント別の初動

| 事象 | 初動 |
|---|---|
| 認証情報の漏洩疑い（service_role 等） | Supabase Dashboard → Settings → API で **キーをローテート** → Vercel env 差し替え → 再デプロイ |
| 招待コードの漏洩 | 管理 > 設定 → 招待リンクを失効/再生成（監査ログに記録される） |
| 大量スパム投稿 | レート制限が一次防壁。突破されたら該当アカウントを休止（管理 > メンバー）→ pending_review なので公開被害はない |
| 匿名の露出バグ疑い | **最優先で対応**。[anonymity.md](anonymity.md) の禁止変更が入っていないか直近コミットを確認 → `npm run db:test`（rls_anonymity）→ 該当コミット revert |
| 他教会のデータが見えた報告 | 再現手順を確保 → rls_isolation テストに再現ケースを追加 → 修正 migration → 本番適用 |
| Egress 急増 | [egress-cost.md](egress-cost.md) の監視手順。LIMIT の無い新規クエリを疑う |
| DB 誤操作（削除等） | 直近の backups/ からリストア。**操作前バックアップが原則**（下記） |

## 破壊的操作の前のルール

- 本番 DB への migration・大量 UPDATE/DELETE の前に `scripts/backup-db.sh` を実行する。
- `supabase db push` 後は「Applying 表示」を信じず、SQL で実体確認する
  （過去に migration 衝突でサイレント部分適用が起きている。HANDOFF 2026-07-03 の教訓）。

## 事後

- 監査ログ（管理 > 監査ログ、audit_logs）で影響範囲を特定。
- 対応内容と再発防止を HANDOFF.md に記録。文書（docs/security/）の該当箇所を更新。
