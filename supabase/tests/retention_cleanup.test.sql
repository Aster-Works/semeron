-- Retention cleanup should prune operational data without deleting prayer bodies.
begin;
select plan(7);

set local role postgres;

update public.churches
   set retention_policy = jsonb_build_object(
     'reflectionVisibleDays', 7,
     'notificationReadDays', 7,
     'notificationUnreadDays', 14,
     'adminNotificationDays', 30,
     'reactionIdentityDays', 7,
     'auditLogDays', 180
   )
 where id = '11111111-1111-1111-1111-111111111111';

insert into public.notifications
  (id, church_id, recipient_membership_id, type, category, channel, title, body, status, read, created_at)
values
  ('fd000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5', 'daily_devotion_published', 'today', 'in_app',
   '{"ja":"古い既読"}', null, 'sent', true, '2020-01-01T00:00:00Z'),
  ('fd000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5', 'daily_devotion_published', 'today', 'in_app',
   '{"ja":"新しい既読"}', null, 'sent', true, now()),
  ('fd000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5', 'daily_devotion_published', 'today', 'in_app',
   '{"ja":"古い未読"}', null, 'sent', false, '2020-01-01T00:00:00Z'),
  ('fd000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e1', 'admin_review_requested', 'admin', 'in_app',
   '{"ja":"古い管理通知"}', null, 'sent', false, '2020-01-01T00:00:00Z');

insert into public.content_items
  (id, church_id, author_membership_id, type, status, visibility, title, body, anonymous, published_at, created_at)
values
  ('fd000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5', 'reflection', 'published', 'church',
   '{"ja":"古い応答"}', '{"ja":"本文"}', true, '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z'),
  ('fd000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5', 'prayer_request', 'published', 'church',
   '{"ja":"残す祈祷課題"}', '{"ja":"本文"}', false, '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z');

insert into public.reactions
  (id, church_id, content_item_id, membership_id, type, created_at)
values
  ('fd000000-0000-0000-0000-000000000020', '11111111-1111-1111-1111-111111111111',
   'fd000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-0000000000e6',
   'amen', '2020-01-01T00:00:00Z');

insert into public.audit_logs
  (id, church_id, actor_membership_id, action, target_type, target_id, metadata, created_at)
values
  ('fd000000-0000-0000-0000-000000000030', '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e1', 'test.old', 'church',
   '11111111-1111-1111-1111-111111111111', '{}', '2020-01-01T00:00:00Z');

select lives_ok(
  $$ select public.run_retention_cleanup('11111111-1111-1111-1111-111111111111') $$,
  'retention cleanup runs for a target church');

select is(
  (select count(*)::int from public.notifications where id in (
    'fd000000-0000-0000-0000-000000000001',
    'fd000000-0000-0000-0000-000000000003',
    'fd000000-0000-0000-0000-000000000004'
  )),
  0, 'old read/unread/admin notifications are deleted');

select is(
  (select count(*)::int from public.notifications where id = 'fd000000-0000-0000-0000-000000000002'),
  1, 'recent notifications are retained');

select is(
  (select status from public.content_items where id = 'fd000000-0000-0000-0000-000000000010'),
  'archived', 'old reflections are archived');

select is(
  (select status from public.content_items where id = 'fd000000-0000-0000-0000-000000000011'),
  'published', 'old prayer requests are not deleted or archived by reflection cleanup');

select is(
  (select count(*)::int from public.reactions where id = 'fd000000-0000-0000-0000-000000000020'),
  0, 'old member-linked reaction rows are deleted');

select is(
  (select count(*)::int from public.audit_logs where id = 'fd000000-0000-0000-0000-000000000030'),
  0, 'old audit logs are deleted after the configured window');

select * from finish();
rollback;
