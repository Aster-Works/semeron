-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0006 pastor_assist — 教会ごとの Pastor Assist（AI）設定                ║
-- ║ 出典: 07 Phase 5 / 08 AI Prompt Pack §11-13                            ║
-- ║                                                                        ║
-- ║  Pastor Assist は管理者限定の下書き・確認補助。既定は無効（opt-in）。   ║
-- ║  - pastor_assist_enabled: AI 補助機能そのものの有効化。                 ║
-- ║  - allow_prayer_ai: 祈祷課題の本文を AI に送ることを許可（別の同意）。  ║
-- ║    要配慮情報を含みうるため、enabled とは独立に既定 false。             ║
-- ║                                                                        ║
-- ║  churches の UPDATE は既存 RLS で owner/pastor に限定済み（churches_    ║
-- ║  update）。よって新ポリシーは不要。監査は既存 audit_logs を再利用する。 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

alter table public.churches
  add column pastor_assist_enabled boolean not null default false;

alter table public.churches
  add column allow_prayer_ai boolean not null default false;

comment on column public.churches.pastor_assist_enabled is
  'Pastor Assist（管理者限定AI補助）を有効にするか。既定 false（opt-in）。';
comment on column public.churches.allow_prayer_ai is
  '祈祷課題の本文を AI に送ることを許可するか。要配慮情報を含みうるため既定 false。';

-- Pastor Assist が許可されているかの判定ヘルパー（private, security definer）。
-- サーバーアクションでも二重に確認するが、DB 側にも意図を明示しておく。
create or replace function private.pastor_assist_allowed(target_church uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select pastor_assist_enabled from public.churches where id = target_church),
    false
  ) and private.is_church_admin(target_church);
$$;
grant execute on function private.pastor_assist_allowed(uuid) to authenticated;
