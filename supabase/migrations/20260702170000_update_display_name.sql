-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0008 update_my_display_name — 本人による表示名変更（Phase2 Beta磨き） ║
-- ║                                                                        ║
-- ║ memberships の UPDATE は管理者限定（memberships_update）のため、       ║
-- ║ 会員本人が display_name だけを安全に変更できる RPC を用意する。        ║
-- ║ security definer + 列を display_name に限定 = status/role には触れない ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create or replace function public.update_my_display_name(p_church uuid, p_display_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  trimmed text := btrim(coalesce(p_display_name, ''));
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if char_length(trimmed) < 1 or char_length(trimmed) > 60 then
    raise exception 'display name must be 1-60 characters';
  end if;

  update public.memberships
     set display_name = trimmed
   where church_id = p_church
     and user_id = uid
     and status = 'active';
  if not found then
    raise exception 'membership not found';
  end if;

  -- profiles 側の表示名も同期しておく（将来のフォールバック用）
  update public.profiles set display_name = trimmed where user_id = uid;
end;
$$;

revoke execute on function public.update_my_display_name(uuid, text) from public, anon;
grant execute on function public.update_my_display_name(uuid, text) to authenticated;
