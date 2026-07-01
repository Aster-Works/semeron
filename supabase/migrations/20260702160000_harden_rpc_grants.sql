-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0007 harden_rpc_grants — security definer RPC の実行権限を絞る        ║
-- ║ 出典: Supabase security advisor (本番プロジェクト初回スキャン)         ║
-- ║                                                                        ║
-- ║ create_church / join_church / devotion_completion_counts は認証済み    ║
-- ║ ユーザー専用。anon / public からの EXECUTE を明示的に revoke する      ║
-- ║ （関数内の auth.uid() チェックに加えた深層防御）。                     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

revoke execute on function public.create_church(jsonb, text, text, text, text[], text, text) from public, anon;
revoke execute on function public.join_church(text, text) from public, anon;
revoke execute on function public.devotion_completion_counts(uuid) from public, anon;
revoke execute on function public.moderate_prayer(uuid, text, text, jsonb, jsonb, text) from public, anon;

-- private スキーマのヘルパーも同様に絞る（authenticated のみ）。
revoke execute on function private.pastor_assist_allowed(uuid) from public, anon;
