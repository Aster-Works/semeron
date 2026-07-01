-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0004 rpcs — Phase 3 のフロー用 RPC                                     ║
-- ║  - create_church: 教会作成＋作成者を owner/pastor で所属させる          ║
-- ║  - join_church:   招待コードで参加（未所属ユーザーは churches を RLS で  ║
-- ║                   引けないため security definer で解決する）            ║
-- ║  - moderate_prayer: 承認/却下を「更新＋レビュー＋監査」で原子的に。      ║
-- ║                   SECURITY INVOKER のため RLS が権限(can_moderate)を担保。║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- 教会作成。作成者(auth.uid)を owner+pastor の active member にする。
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

  insert into public.membership_roles (membership_id, role)
    values (new_mem_id, 'owner'), (new_mem_id, 'pastor');

  insert into public.profiles (user_id, display_name, preferred_locale)
    values (uid, p_display_name, p_default_locale)
    on conflict (user_id) do nothing;

  return new_church;
end; $$;

-- 招待コードで参加。既に所属していれば active に戻して返す。
create or replace function public.join_church(p_invite_code text, p_display_name text)
returns public.churches
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  ch public.churches;
  existing_id uuid;
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

  select id into existing_id from public.memberships
    where church_id = ch.id and user_id = uid;
  if existing_id is not null then
    update public.memberships set status = 'active' where id = existing_id;
    return ch;
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

-- 祈祷課題のモデレーション（承認/却下/要修正）を原子的に。
-- SECURITY INVOKER: 更新・レビュー・監査の各文は RLS で can_moderate を要求する。
create or replace function public.moderate_prayer(
  p_content uuid,
  p_decision text,          -- approved | rejected | needs_revision
  p_visibility text default null,
  p_public_title jsonb default null,
  p_public_body jsonb default null,
  p_note text default null
) returns void
language plpgsql set search_path = '' as $$
declare
  ch uuid;
  mem uuid;
  new_status text;
begin
  if p_decision not in ('approved','rejected','needs_revision') then
    raise exception 'invalid decision' using errcode = '22023';
  end if;

  select church_id into ch from public.content_items where id = p_content;
  if ch is null then
    raise exception 'not found or not permitted' using errcode = '42501';
  end if;
  mem := private.my_membership_id(ch);

  new_status := case p_decision
    when 'approved' then 'published'
    when 'rejected' then 'rejected'
    else 'pending_review' end;

  update public.content_items set
    status       = new_status,
    visibility   = coalesce(p_visibility, visibility),
    title        = coalesce(p_public_title, title),
    body         = coalesce(p_public_body, body),
    published_at = case when p_decision = 'approved' then now() else published_at end
  where id = p_content;   -- RLS: content_update の with check が can_moderate/admin を要求

  insert into public.moderation_reviews
      (content_item_id, church_id, reviewer_membership_id, decision, note)
    values (p_content, ch, mem, p_decision, p_note);

  insert into public.audit_logs
      (church_id, actor_membership_id, action, target_type, target_id, metadata)
    values (ch, mem, 'moderation.' || p_decision, 'content_item', p_content,
            jsonb_build_object('visibility', coalesce(p_visibility, '')));
end; $$;

grant execute on function public.create_church(jsonb, text, text, text, text[], text, text) to authenticated;
grant execute on function public.join_church(text, text) to authenticated;
grant execute on function public.moderate_prayer(uuid, text, text, jsonb, jsonb, text) to authenticated;
