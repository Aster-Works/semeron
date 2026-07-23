// 祈祷フィードの表示期限フィルタ（純粋関数・テスト可能にするため server 依存なし）。

/** 証しコメント付きの期限切れ課題を表示し続ける時間（コメント記録から1日）。 */
const ANSWERED_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * 祈祷フィードで「表示期限を過ぎていない」行だけに絞る PostgREST 条件。
 * 期限なし / 期限が未来 / 証しコメントから1日以内 の3条件のいずれか。
 * 期限切れでも証し（answered/thanksgiving）が記録されたら、記録から1日だけ
 * 会衆に見せてから静かに消す（無期限に残さない）。answered_at は
 * mark_prayer_answered RPC が to_jsonb(now()) で刻む ISO 文字列（UTC）のため、
 * PostgREST の text 比較（->>）で時刻順が保たれる。
 */
export function notExpiredOr(nowIso: string): string {
  const answeredKeepAfter = new Date(Date.parse(nowIso) - ANSWERED_GRACE_MS).toISOString();
  return (
    `expires_at.is.null,expires_at.gt.${nowIso},` +
    `and(prayer_outcome.in.(answered,thanksgiving),metadata->>answered_at.gt.${answeredKeepAfter})`
  );
}
