-- Retention policy, notification cleanup controls, and social safety tools.

-- ── Church-level retention policy ─────────────────────────────────────
alter table public.churches
  add column if not exists retention_policy jsonb not null default jsonb_build_object(
    'reflectionVisibleDays', 30,
    'notificationReadDays', 30,
    'notificationUnreadDays', 90,
    'adminNotificationDays', 180,
    'reactionIdentityDays', 90,
    'auditLogDays', 730
  );

update public.churches
   set retention_policy = jsonb_build_object(
    'reflectionVisibleDays', coalesce((retention_policy->>'reflectionVisibleDays')::int, 30),
    'notificationReadDays', coalesce((retention_policy->>'notificationReadDays')::int, 30),
    'notificationUnreadDays', coalesce((retention_policy->>'notificationUnreadDays')::int, 90),
    'adminNotificationDays', coalesce((retention_policy->>'adminNotificationDays')::int, 180),
    'reactionIdentityDays', coalesce((retention_policy->>'reactionIdentityDays')::int, 90),
    'auditLogDays', coalesce((retention_policy->>'auditLogDays')::int, 730)
   )
 where retention_policy is not null;

-- ── Notification center organization ──────────────────────────────────
alter table public.notifications
  add column if not exists category text not null default 'general',
  add column if not exists archived_at timestamptz,
  add column if not exists muted_by_recipient boolean not null default false;

alter table public.notifications drop constraint if exists notifications_category_check;
alter table public.notifications
  add constraint notifications_category_check
  check (category in ('today','prayer','admin','security','system','social','general'));

update public.notifications
   set category = case
     when type in ('daily_devotion_published','daily_devotion_reminder') then 'today'
     when type in ('prayer_request_submitted_to_moderators','prayer_request_approved','prayer_request_rejected') then 'prayer'
     when type in ('prayer_request_prayed') then 'social'
     when type in ('weekly_summary_to_admins','admin_review_requested') then 'admin'
     else 'general'
   end
 where category = 'general';

create index if not exists notifications_recipient_active_idx
  on public.notifications (recipient_membership_id, read, created_at desc)
  where archived_at is null and muted_by_recipient = false;
create index if not exists notifications_retention_idx
  on public.notifications (church_id, category, read, created_at);

create index if not exists content_items_search_idx
  on public.content_items
  using gin (to_tsvector('simple', coalesce(title::text, '') || ' ' || coalesce(body::text, '')))
  where type in ('prayer_request','reflection','testimony','announcement');

-- Admin notification ops include the non-identifying category for filtering.
drop function if exists public.church_notification_ops(uuid, boolean);
create function public.church_notification_ops(
  target_church uuid,
  p_only_failed boolean default false
) returns table (
  id uuid, church_id uuid, type text, channel text,
  title jsonb, body jsonb, status text,
  scheduled_at timestamptz, sent_at timestamptz, failure_reason text,
  created_at timestamptz, read boolean, category text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_church_admin(target_church) then
    return;
  end if;
  return query
    select n.id, n.church_id, n.type, n.channel,
           n.title, n.body, n.status,
           n.scheduled_at, n.sent_at, n.failure_reason,
           n.created_at, n.read, n.category
    from public.notifications n
    where n.church_id = target_church
      and (not p_only_failed or n.status = 'failed')
    order by n.created_at desc;
end; $$;
grant execute on function public.church_notification_ops(uuid, boolean) to authenticated;

-- ── Notification categories at source ─────────────────────────────────
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
      (church_id, recipient_membership_id, type, category, channel, title, body, data)
    values (
      new.church_id, new.author_membership_id,
      ntype,
      'prayer',
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
      (church_id, recipient_membership_id, type, category, channel, title, body, data)
    select new.church_id, m.id, 'daily_devotion_published', 'today', 'in_app',
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
          and exists (
            select 1 from public.group_memberships gm
            where gm.group_id = new.group_id and gm.membership_id = m.id
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
        (church_id, recipient_membership_id, type, category, channel, title, body, data)
      values (new.church_id, author, 'prayer_request_prayed', 'social', 'in_app',
        '{"ja":"あなたの祈祷課題が覚えられています","en":"Someone is praying with you"}'::jsonb,
        '{"ja":"誰かがあなたの祈祷課題のために祈りました。","en":"Someone prayed for your request."}'::jsonb,
        private.notification_data(new.church_id, new.content_item_id, 'prayer_request_prayed'));
    end if;
  end if;
  return new;
end; $$;

-- ── Retention cleanup ─────────────────────────────────────────────────
create or replace function private.retention_days(
  policy jsonb,
  setting_key text,
  fallback_days int,
  min_days int,
  max_days int
) returns int
language sql immutable set search_path = '' as $$
  select greatest(
    min_days,
    least(
      max_days,
      case
        when coalesce(policy->>setting_key, '') ~ '^[0-9]{1,5}$'
        then (policy->>setting_key)::int
        else fallback_days
      end
    )
  );
$$;

create or replace function public.run_retention_cleanup(target_church uuid default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  church_row record;
  policy jsonb;
  cutoff timestamptz;
  affected int;
  read_notifications int := 0;
  unread_notifications int := 0;
  admin_notifications int := 0;
  archived_reflections int := 0;
  reactions_removed int := 0;
  audit_logs_removed int := 0;
begin
  for church_row in
    select id, coalesce(retention_policy, '{}'::jsonb) as retention_policy
      from public.churches
     where target_church is null or id = target_church
  loop
    policy := church_row.retention_policy;

    cutoff := now() - make_interval(days => private.retention_days(policy, 'notificationReadDays', 30, 7, 3650));
    delete from public.notifications
     where church_id = church_row.id
       and read = true
       and created_at < cutoff;
    get diagnostics affected = row_count;
    read_notifications := read_notifications + affected;

    cutoff := now() - make_interval(days => private.retention_days(policy, 'notificationUnreadDays', 90, 14, 3650));
    delete from public.notifications
     where church_id = church_row.id
       and read = false
       and created_at < cutoff;
    get diagnostics affected = row_count;
    unread_notifications := unread_notifications + affected;

    cutoff := now() - make_interval(days => private.retention_days(policy, 'adminNotificationDays', 180, 30, 3650));
    delete from public.notifications
     where church_id = church_row.id
       and category in ('admin','security')
       and created_at < cutoff;
    get diagnostics affected = row_count;
    admin_notifications := admin_notifications + affected;

    cutoff := now() - make_interval(days => private.retention_days(policy, 'reflectionVisibleDays', 30, 7, 3650));
    update public.content_items
       set status = 'archived',
           updated_at = now()
     where church_id = church_row.id
       and type = 'reflection'
       and status = 'published'
       and coalesce(published_at, created_at) < cutoff;
    get diagnostics affected = row_count;
    archived_reflections := archived_reflections + affected;

    cutoff := now() - make_interval(days => private.retention_days(policy, 'reactionIdentityDays', 90, 7, 3650));
    delete from public.reactions
     where church_id = church_row.id
       and type in ('amen','prayed','thanks')
       and created_at < cutoff;
    get diagnostics affected = row_count;
    reactions_removed := reactions_removed + affected;

    cutoff := now() - make_interval(days => private.retention_days(policy, 'auditLogDays', 730, 180, 3650));
    delete from public.audit_logs
     where church_id = church_row.id
       and created_at < cutoff;
    get diagnostics affected = row_count;
    audit_logs_removed := audit_logs_removed + affected;
  end loop;

  return jsonb_build_object(
    'readNotificationsDeleted', read_notifications,
    'unreadNotificationsDeleted', unread_notifications,
    'adminNotificationsDeleted', admin_notifications,
    'reflectionsArchived', archived_reflections,
    'reactionsDeleted', reactions_removed,
    'auditLogsDeleted', audit_logs_removed
  );
end; $$;

revoke all on function public.run_retention_cleanup(uuid) from public, anon, authenticated;
grant execute on function public.run_retention_cleanup(uuid) to service_role;
