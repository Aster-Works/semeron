-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ ai_addon_entitlement                                                  ║
-- ║ AI サポート（Pastor Assist）を課金アドオンにする。                     ║
-- ║ 無料プランでは使えない（アドオン購入教会だけが有効化できる）。         ║
-- ║                                                                        ║
-- ║ 不変条件（DBで保証）:                                                  ║
-- ║  (1) ai_addon_enabled は課金エンタイトルメント。会員(authenticated/    ║
-- ║      anon)からは変更できない。変更できるのは service_role（課金処理）   ║
-- ║      と postgres（migration/definer）のみ。                            ║
-- ║  (2) アドオン未購入(false)なら pastor_assist_enabled /                 ║
-- ║      allow_prayer_ai は常に false に落とす（＝無料では AI を使えない）。║
-- ╚══════════════════════════════════════════════════════════════════════╝

alter table public.churches
  add column if not exists ai_addon_enabled boolean not null default false;

comment on column public.churches.ai_addon_enabled is
  'AIサポート(Pastor Assist)の課金アドオン。true の教会だけが AI 補助を有効化できる。既定 false（無料では不可）。変更は service_role(課金)のみ。';

-- SECURITY INVOKER（definer にしない）＝ current_user が呼び出しロールを反映する。
-- 既存の private.enforce_prayer_anonymity と同じ invoker トリガの型。
create or replace function private.enforce_ai_entitlement()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- (1) 会員(authenticated/anon)は課金エンタイトルメントを自己付与できない。
  if tg_op = 'UPDATE'
     and current_user in ('authenticated', 'anon')
     and new.ai_addon_enabled is distinct from old.ai_addon_enabled then
    new.ai_addon_enabled := old.ai_addon_enabled;
  end if;
  -- (2) アドオン未購入なら AI 補助トグルは常に無効（無料では使えない）。
  if not coalesce(new.ai_addon_enabled, false) then
    new.pastor_assist_enabled := false;
    new.allow_prayer_ai := false;
  end if;
  return new;
end; $$;

drop trigger if exists churches_enforce_ai_entitlement on public.churches;
create trigger churches_enforce_ai_entitlement
  before insert or update on public.churches
  for each row execute function private.enforce_ai_entitlement();

-- 既存教会のバックフィル: アドオン未購入なら AI 補助を無効化する。
update public.churches
set pastor_assist_enabled = false, allow_prayer_ai = false
where ai_addon_enabled = false
  and (pastor_assist_enabled is true or allow_prayer_ai is true);
