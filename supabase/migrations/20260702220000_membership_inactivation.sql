-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0013 membership_inactivation — メンバー休止をソフト削除として扱う     ║
-- ║                                                                        ║
-- ║ 方針: Auth user は削除せず、memberships.status を inactive にする。      ║
-- ║ active membership だけが教会コンテキストを取得できるため、休止された     ║
-- ║ メンバーは教会画面・管理画面・通知等に入れなくなる。                   ║
-- ║                                                                        ║
-- ║ 重要: 既存 join_church は既存membershipを招待コードで active に戻して    ║
-- ║ いたため、inactive/removed は管理者復帰以外では戻せないようにする。     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- メンバー状態変更は owner/pastor のみに揃える。物理削除はまだアプリ仕様外なので閉じる。
drop policy if exists memberships_insert on public.memberships;
drop policy if exists memberships_update on public.memberships;
drop policy if exists memberships_delete on public.memberships;

create policy memberships_insert on public.memberships for insert to authenticated
  with check (private.has_church_role(church_id, array['owner','pastor']));

create policy memberships_update on public.memberships for update to authenticated
  using (private.has_church_role(church_id, array['owner','pastor']))
  with check (private.has_church_role(church_id, array['owner','pastor']));

-- 招待コード参加。既存の active/invited は許可するが、inactive/removed は管理者復帰のみ。
create or replace function public.join_church(p_invite_code text, p_display_name text)
returns public.churches
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  ch public.churches;
  existing_id uuid;
  existing_status text;
  new_mem_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into ch from public.churches
    where lower(invite_code) = lower(trim(p_invite_code)) and status = 'active';
  if not found then
    raise exception 'invalid invite code' using errcode = '22023';
  end if;

  select id, status into existing_id, existing_status
    from public.memberships
    where church_id = ch.id and user_id = uid;

  if existing_id is not null then
    if existing_status = 'active' then
      return ch;
    end if;

    if existing_status = 'invited' then
      update public.memberships
         set status = 'active',
             display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
             joined_at = coalesce(joined_at, now())
       where id = existing_id;
      return ch;
    end if;

    raise exception 'membership is inactive; contact church admin' using errcode = '42501';
  end if;

  insert into public.memberships (church_id, user_id, display_name, status, joined_at)
    values (ch.id, uid, p_display_name, 'active', now())
    returning id into new_mem_id;
  insert into public.membership_roles (membership_id, role) values (new_mem_id, 'member');

  insert into public.profiles (user_id, display_name, preferred_locale)
    values (uid, p_display_name, ch.default_locale)
    on conflict (user_id) do nothing;

  return ch;
end; $$;

revoke execute on function public.join_church(text, text) from public, anon;
grant execute on function public.join_church(text, text) to authenticated;
