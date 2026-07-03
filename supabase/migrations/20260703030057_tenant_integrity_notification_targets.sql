-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ tenant_integrity_notification_targets                               ║
-- ║                                                                      ║
-- ║  - Cross-church membership/content relationships are rejected at DB   ║
-- ║    level, not only by Server Actions or UI.                           ║
-- ║  - Notification payloads carry a real app path for Web Push clicks.   ║
-- ║  - RLS write policies are split by action to remove duplicate SELECT  ║
-- ║    advisor warnings from previous FOR ALL policies.                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── Tenant integrity triggers ──────────────────────────────────────────

create or replace function private.enforce_group_membership_church()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  grp_church uuid;
  mem_church uuid;
begin
  select church_id into grp_church from public.groups where id = new.group_id;
  select church_id into mem_church from public.memberships where id = new.membership_id;

  if grp_church is null or mem_church is null or grp_church is distinct from mem_church then
    raise exception 'group membership must stay within one church'
      using errcode = '23514';
  end if;

  return new;
end; $$;

drop trigger if exists group_memberships_church_match on public.group_memberships;
create trigger group_memberships_church_match
  before insert or update on public.group_memberships
  for each row execute function private.enforce_group_membership_church();

create or replace function private.enforce_group_leader_church()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  leader_church uuid;
begin
  if tg_op = 'UPDATE' and old.church_id is distinct from new.church_id then
    raise exception 'group church_id cannot be changed'
      using errcode = '23514';
  end if;

  if new.leader_membership_id is null then
    return new;
  end if;

  select church_id into leader_church
    from public.memberships
   where id = new.leader_membership_id;

  if leader_church is null or leader_church is distinct from new.church_id then
    raise exception 'group leader must belong to the group church'
      using errcode = '23514';
  end if;

  return new;
end; $$;

drop trigger if exists groups_leader_church_match on public.groups;
create trigger groups_leader_church_match
  before insert or update of church_id, leader_membership_id on public.groups
  for each row execute function private.enforce_group_leader_church();

create or replace function private.enforce_content_author_church()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  author_church uuid;
begin
  if tg_op = 'UPDATE' and old.church_id is distinct from new.church_id then
    raise exception 'content church_id cannot be changed'
      using errcode = '23514';
  end if;

  if new.author_membership_id is null then
    return new;
  end if;

  select church_id into author_church
    from public.memberships
   where id = new.author_membership_id;

  if author_church is null or author_church is distinct from new.church_id then
    raise exception 'content author must belong to the content church'
      using errcode = '23514';
  end if;

  return new;
end; $$;

drop trigger if exists content_items_author_church_match on public.content_items;
create trigger content_items_author_church_match
  before insert or update of church_id, author_membership_id on public.content_items
  for each row execute function private.enforce_content_author_church();

-- ── Notification target paths ──────────────────────────────────────────

alter table public.notifications add column if not exists processing_started_at timestamptz;
alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications
  add constraint notifications_status_check
  check (status in ('queued','processing','sent','failed','skipped'));

create or replace function private.notification_target_path(
  target_church uuid,
  target_content uuid default null,
  notification_type text default null
) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  ch record;
  item_type text;
  base_path text;
begin
  select slug, default_locale into ch
    from public.churches
   where id = target_church;

  if not found then
    return '/';
  end if;

  base_path := '/' || ch.default_locale || '/church/' || ch.slug;

  if target_content is not null then
    select type into item_type
      from public.content_items
     where id = target_content
       and church_id = target_church;
  end if;

  if item_type = 'devotion' or notification_type = 'daily_devotion_published' then
    return base_path || '/today';
  elsif item_type = 'prayer_request'
     or notification_type in ('prayer_request_approved', 'prayer_request_rejected', 'prayer_request_prayed') then
    return base_path || '/prayers';
  end if;

  return base_path || '/inbox';
end; $$;

create or replace function private.notification_data(
  target_church uuid,
  target_content uuid,
  notification_type text
) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'content_item_id', target_content,
    'target_path', private.notification_target_path(target_church, target_content, notification_type)
  );
$$;

-- Existing notification rows get click targets too.
update public.notifications n
   set data = coalesce(n.data, '{}'::jsonb) || jsonb_build_object(
     'target_path',
     private.notification_target_path(
       n.church_id,
       case
         when coalesce(n.data, '{}'::jsonb) ? 'content_item_id'
          and n.data->>'content_item_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (n.data->>'content_item_id')::uuid
         else null
       end,
       n.type
     )
   )
 where n.channel = 'in_app'
   and not (coalesce(n.data, '{}'::jsonb) ? 'target_path');

create or replace function private.notify_on_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ntype text;
begin
  if new.type = 'prayer_request'
     and old.status = 'pending_review'
     and new.status in ('published','rejected')
     and new.author_membership_id is not null then
    ntype := case when new.status = 'published' then 'prayer_request_approved' else 'prayer_request_rejected' end;

    insert into public.notifications
      (church_id, recipient_membership_id, type, channel, title, body, data)
    values (
      new.church_id, new.author_membership_id,
      ntype,
      'in_app',
      case when new.status = 'published'
        then '{"ja":"祈祷課題が共有されました","en":"Your prayer request was shared"}'::jsonb
        else '{"ja":"祈祷課題は今回は共有されませんでした","en":"Your prayer request was not shared this time"}'::jsonb end,
      case when new.status = 'published'
        then '{"ja":"選んだ範囲に表示されました。","en":"It now appears to the visibility you chose."}'::jsonb
        else '{"ja":"牧師が個別にご連絡することがあります。","en":"A pastor may reach out to you."}'::jsonb end,
      private.notification_data(new.church_id, new.id, ntype)
    );
  end if;
  return new;
end; $$;

create or replace function private.notify_on_devotion_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'devotion' and new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.notifications
      (church_id, recipient_membership_id, type, channel, title, body, data)
    select new.church_id, m.id, 'daily_devotion_published', 'in_app',
      '{"ja":"今日のみことばが届きました","en":"Today''s Word has arrived"}'::jsonb,
      new.title,
      private.notification_data(new.church_id, new.id, 'daily_devotion_published')
    from public.memberships m
    where m.church_id = new.church_id
      and m.status = 'active'
      and (
        new.visibility in ('church', 'anonymous_church')
        or (
          new.visibility = 'pastor_only'
          and exists (
            select 1 from public.membership_roles r
            where r.membership_id = m.id and r.role in ('owner','pastor')
          )
        )
        or (
          new.visibility = 'elders'
          and exists (
            select 1 from public.membership_roles r
            where r.membership_id = m.id and r.role in ('owner','pastor','elder')
          )
        )
        or (
          new.visibility = 'prayer_team'
          and exists (
            select 1 from public.membership_roles r
            where r.membership_id = m.id and r.role in ('owner','pastor','elder','prayer_team')
          )
        )
        or (
          new.visibility = 'group'
          and new.group_id is not null
          and (
            exists (
              select 1 from public.group_memberships gm
              where gm.group_id = new.group_id and gm.membership_id = m.id
            )
            or exists (
              select 1 from public.membership_roles r
              where r.membership_id = m.id and r.role in ('owner','pastor','elder','staff')
            )
          )
        )
      );
  end if;
  return new;
end; $$;

create or replace function private.notify_on_prayed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  author uuid;
begin
  if new.type = 'prayed' then
    select author_membership_id into author
      from public.content_items
     where id = new.content_item_id
       and church_id = new.church_id;

    if author is not null and author <> new.membership_id then
      insert into public.notifications
        (church_id, recipient_membership_id, type, channel, title, body, data)
      values (new.church_id, author, 'prayer_request_prayed', 'in_app',
        '{"ja":"あなたの祈祷課題が覚えられています","en":"Someone is praying with you"}'::jsonb,
        '{"ja":"誰かがあなたの祈祷課題のために祈りました。","en":"Someone prayed for your request."}'::jsonb,
        private.notification_data(new.church_id, new.content_item_id, 'prayer_request_prayed'));
    end if;
  end if;
  return new;
end; $$;

-- ── Split FOR ALL policies so SELECT has one permissive policy ─────────

drop policy if exists groups_write on public.groups;
create policy groups_insert on public.groups for insert to authenticated
  with check (private.is_church_admin(church_id));
create policy groups_update on public.groups for update to authenticated
  using (private.is_church_admin(church_id))
  with check (private.is_church_admin(church_id));
create policy groups_delete on public.groups for delete to authenticated
  using (private.is_church_admin(church_id));

drop policy if exists group_memberships_write on public.group_memberships;
create policy group_memberships_insert on public.group_memberships for insert to authenticated
  with check (exists (select 1 from public.groups g
                      where g.id = group_id and private.is_church_admin(g.church_id)));
create policy group_memberships_update on public.group_memberships for update to authenticated
  using (exists (select 1 from public.groups g
                 where g.id = group_id and private.is_church_admin(g.church_id)))
  with check (exists (select 1 from public.groups g
                      where g.id = group_id and private.is_church_admin(g.church_id)));
create policy group_memberships_delete on public.group_memberships for delete to authenticated
  using (exists (select 1 from public.groups g
                 where g.id = group_id and private.is_church_admin(g.church_id)));

drop policy if exists membership_roles_write on public.membership_roles;
create policy membership_roles_insert on public.membership_roles for insert to authenticated
  with check (exists (
    select 1 from public.memberships m
    where m.id = membership_id
      and private.has_church_role(m.church_id, array['owner','pastor'])
  ));
create policy membership_roles_update on public.membership_roles for update to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.id = membership_id
      and private.has_church_role(m.church_id, array['owner','pastor'])
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.id = membership_id
      and private.has_church_role(m.church_id, array['owner','pastor'])
  ));
create policy membership_roles_delete on public.membership_roles for delete to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.id = membership_id
      and private.has_church_role(m.church_id, array['owner','pastor'])
  ));
