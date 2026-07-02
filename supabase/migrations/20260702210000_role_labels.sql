-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0012 role_labels — 役割の「呼び方」を教会ごとにカスタマイズ            ║
-- ║                                                                        ║
-- ║ 方針(A): 権限モデル(8ロールとRLS)は固定のまま、表示ラベルだけを         ║
-- ║ churches.role_labels で上書き可能にする。                              ║
-- ║   形: { "elder": {"ja":"執事","en":"Deacon"}, ... }                     ║
-- ║ キーは既存8ロール、値は言語コード→表示名。空/未指定は標準ラベル。       ║
-- ║ 変更は owner/pastor（churches_update RLS と同じ層）。                   ║
-- ║                                                                        ║
-- ║ あわせて create_church を「owner のみ付与」に変更（無牧教会対応）。      ║
-- ║ 牧師が作成する場合は、作成後に役割編集で自ら pastor を付与できる        ║
-- ║ （owner は役割編集が可能）。権限面は owner が全機能を持つため欠けなし。  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

alter table public.churches
  add column if not exists role_labels jsonb not null default '{}'::jsonb;

create or replace function public.create_church(
  p_name jsonb,
  p_slug text,
  p_display_name text,
  p_default_locale text default 'ja',
  p_content_languages text[] default array['ja'],
  p_timezone text default 'Asia/Tokyo',
  p_invite_code text default null
) returns public.churches
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  new_church public.churches;
  code text := coalesce(nullif(trim(p_invite_code), ''),
                        upper(substr(md5(gen_random_uuid()::text), 1, 8)));
  new_mem_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.churches (name, slug, default_locale, content_languages, timezone, invite_code)
    values (p_name, p_slug, p_default_locale, p_content_languages, p_timezone, code)
    returning * into new_church;

  insert into public.memberships (church_id, user_id, display_name, status, joined_at)
    values (new_church.id, uid, p_display_name, 'active', now())
    returning id into new_mem_id;

  -- 無牧教会に対応するため owner のみ。pastor は必要なら役割編集で付与する。
  insert into public.membership_roles (membership_id, role)
    values (new_mem_id, 'owner');

  insert into public.profiles (user_id, display_name, preferred_locale)
    values (uid, p_display_name, p_default_locale)
    on conflict (user_id) do nothing;

  return new_church;
end; $$;
