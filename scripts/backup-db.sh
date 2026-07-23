#!/usr/bin/env bash
# Semeron 本番DBバックアップ（Supabase Free は自動バックアップなし → 自前で取る）
#
# 使い方:
#   SUPABASE_DB_PASSWORD=... scripts/backup-db.sh
#   （環境変数が無ければ macOS Keychain の "Semeron DB" を探し、無ければ入力を求める）
#
# 前提: supabase CLI がインストール済みで、このリポジトリが `supabase link` 済みであること。
# 出力: backups/YYYY-MM-DD-schema.sql / YYYY-MM-DD-data.sql（直近 KEEP 世代を保持）
# 注意: パスワード・ダンプをリポジトリにコミットしない（backups/ は .gitignore 済み）。
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="backups"
KEEP=14
DATE="$(date +%F)"

mkdir -p "$BACKUP_DIR"

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  SUPABASE_DB_PASSWORD="$(security find-generic-password -s 'Semeron DB' -w 2>/dev/null || true)"
fi
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  read -r -s -p "Supabase DB password: " SUPABASE_DB_PASSWORD; echo
fi
export SUPABASE_DB_PASSWORD

echo "== schema dump =="
supabase db dump --linked -p "$SUPABASE_DB_PASSWORD" -f "$BACKUP_DIR/$DATE-schema.sql"
echo "== data dump =="
supabase db dump --linked -p "$SUPABASE_DB_PASSWORD" --data-only -f "$BACKUP_DIR/$DATE-data.sql"

# 世代管理: 古いものから KEEP 世代を超えた分を削除
ls -1t "$BACKUP_DIR"/*-schema.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs rm -f 2>/dev/null || true
ls -1t "$BACKUP_DIR"/*-data.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs rm -f 2>/dev/null || true

echo "== done =="
ls -lh "$BACKUP_DIR/$DATE-schema.sql" "$BACKUP_DIR/$DATE-data.sql"
