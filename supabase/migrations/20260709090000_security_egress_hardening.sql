-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ security_egress_hardening                                             ║
-- ║ セキュリティ監査(2026-07)の Phase 0（多層防御の穴を塞ぐ）。            ║
-- ║ いずれも「実害は未確認だが、防壁が1枚しかない/攻撃面が広い」箇所を    ║
-- ║ 最小権限へ寄せる。データは一切変更しない（GRANT/REVOKE のみ）。       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── R1: content_feed ビューへの anon/PUBLIC 権限を剥がす ───────────────
-- content_feed は security_invoker=true のため基底表 content_items の RLS で
-- 既に anon はブロックされる（実機確認済み: permission denied）。しかし
-- ビュー自体に anon の INSERT/UPDATE/DELETE 等が付与されており、多層防御上
-- 不要かつ危険。SELECT のみ authenticated に限定し、他は全て剥がす。
revoke all on public.content_feed from anon;
revoke all on public.content_feed from public;
grant select on public.content_feed to authenticated;

-- ── R2: owns_content(SECURITY DEFINER) を anon から実行不可にする ──────
-- 未認証は my_membership_id が null で常に false が返るだけだが、定義者権限の
-- 関数を未認証に開ける必要はない。authenticated / service_role のみ実行可に。
revoke execute on function public.owns_content(uuid) from anon;
revoke execute on function public.owns_content(uuid) from public;
grant execute on function public.owns_content(uuid) to authenticated;

-- ── 念のため: 機密テーブルへの anon 権限が無いことを保証（冪等）─────────
-- 既存 migration で revoke 済みだが、リグレッション防止に再度明示する。
revoke all on public.content_items   from anon;
revoke all on public.prayer_logs     from anon;
revoke all on public.completion_logs from anon;
revoke all on public.notifications   from anon;
revoke all on public.memberships     from anon;
revoke all on public.audit_logs      from anon;
revoke all on public.reactions       from anon;
