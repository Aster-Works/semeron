-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ invite_code_rotation_audit_logs                                      ║
-- ║                                                                        ║
-- ║ 安全運用のため、教会招待コードに有効期限・ローテーション時刻を持たせる。║
-- ║ 既存コードは移行から30日後に期限切れとし、join_church は期限切れを拒否。║
-- ╚══════════════════════════════════════════════════════════════════════╝

alter table public.churches
  add column if not exists invite_code_expires_at timestamptz,
  add column if not exists invite_code_rotated_at timestamptz;

update public.churches
   set invite_code_expires_at = coalesce(invite_code_expires_at, now() + interval '30 days'),
       invite_code_rotated_at = coalesce(invite_code_rotated_at, created_at)
 where invite_code_expires_at is null
    or invite_code_rotated_at is null;

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

  insert into public.churches (
    name, slug, default_locale, content_languages, timezone, invite_code,
    invite_code_expires_at, invite_code_rotated_at
  )
    values (
      p_name, p_slug, p_default_locale, p_content_languages, p_timezone, code,
      now() + interval '30 days', now()
    )
    returning * into new_church;

  insert into public.memberships (church_id, user_id, display_name, status, joined_at)
    values (new_church.id, uid, p_display_name, 'active', now())
    returning id into new_mem_id;

  insert into public.membership_roles (membership_id, role)
    values (new_mem_id, 'owner');

  insert into public.profiles (user_id, display_name, preferred_locale)
    values (uid, p_display_name, p_default_locale)
    on conflict (user_id) do nothing;

  return new_church;
end; $$;

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
    where lower(invite_code) = lower(trim(p_invite_code))
      and status = 'active'
      and (invite_code_expires_at is null or invite_code_expires_at > now());
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

revoke execute on function public.create_church(jsonb, text, text, text, text[], text, text) from public, anon;
revoke execute on function public.join_church(text, text) from public, anon;
grant execute on function public.create_church(jsonb, text, text, text, text[], text, text) to authenticated;
grant execute on function public.join_church(text, text) to authenticated;
