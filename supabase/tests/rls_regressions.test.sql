-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ RLS/trigger regressions                                              ║
-- ║ 2026-07-02 review fixes: role scope, group posts, completion target,  ║
-- ║ restricted devotion notifications, duplicate published devotion.      ║
-- ╚══════════════════════════════════════════════════════════════════════╝
begin;
select plan(7);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end; $$;

create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end; $$;

create function pg_temp.update_today_devotion_title() returns integer language plpgsql as $$
declare n int;
begin
  update public.content_items
     set title = '{"ja":"祈祷チームが変更"}'::jsonb
   where id = 'e1000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  return n;
end; $$;

create function pg_temp.insert_pastor_only_devotion_notification_count() returns integer language plpgsql as $$
declare
  new_id uuid;
  n int;
begin
  insert into public.content_items
    (church_id, author_membership_id, type, status, visibility, title, body, devotion_date)
  values
    ('11111111-1111-1111-1111-111111111111',
     'c1000000-0000-0000-0000-0000000000e1',
     'devotion','published','pastor_only',
     '{"ja":"牧師だけの通知"}'::jsonb,'{"ja":"本文"}'::jsonb,'2026-07-05')
  returning id into new_id;

  select count(*)::int into n
    from public.notifications
   where data->>'content_item_id' = new_id::text;
  return n;
end; $$;

-- prayer_team は祈祷課題の承認者であって、デボーション管理者ではない。
select pg_temp.login('a0000000-0000-0000-0000-0000000000e3'); -- ken: prayer_team
select throws_ok(
  $$ insert into public.content_items
       (church_id, author_membership_id, type, status, visibility, title, body)
     values ('11111111-1111-1111-1111-111111111111',
             'c1000000-0000-0000-0000-0000000000e3',
             'devotion','published','church',
             '{"ja":"祈祷チーム公開"}'::jsonb,'{"ja":"本文"}'::jsonb) $$,
  '42501', null, 'prayer_team は published devotion を作成できない');

select is(pg_temp.update_today_devotion_title(), 0, 'prayer_team は既存 devotion を更新できない');

-- completion_logs は、本人が見られる devotion にだけ付けられる。
select pg_temp.as_postgres();
insert into public.content_items
  (id, church_id, author_membership_id, type, status, visibility, title, body, devotion_date)
values
  ('e1000000-0000-0000-0000-000000000099',
   '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e1',
   'devotion','published','pastor_only',
   '{"ja":"牧師だけ"}'::jsonb,'{"ja":"本文"}'::jsonb,'2026-07-04');

select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi: member
select throws_ok(
  $$ insert into public.completion_logs
       (church_id, content_item_id, membership_id, completed_read_at)
     values ('11111111-1111-1111-1111-111111111111',
             'e1000000-0000-0000-0000-000000000099',
             'c1000000-0000-0000-0000-0000000000e5', now()) $$,
  '42501', null, '見えない devotion には completion を付けられない');

-- group visibility は group_id と本人の所属を要求する。
select lives_ok(
  $$ insert into public.content_items
       (church_id, group_id, author_membership_id, type, status, visibility, title, body, requested_visibility)
     values ('11111111-1111-1111-1111-111111111111',
             'd1000000-0000-0000-0000-000000000001',
             'c1000000-0000-0000-0000-0000000000e5',
             'prayer_request','pending_review','group',
             '{"ja":"青年会へ"}'::jsonb,'{"ja":"祈ってください"}'::jsonb,'group') $$,
  'グループ所属者は group prayer を投稿できる');

select pg_temp.login('a0000000-0000-0000-0000-0000000000e7'); -- taro: not in young adults
select throws_ok(
  $$ insert into public.content_items
       (church_id, group_id, author_membership_id, type, status, visibility, title, body, requested_visibility)
     values ('11111111-1111-1111-1111-111111111111',
             'd1000000-0000-0000-0000-000000000001',
             'c1000000-0000-0000-0000-0000000000e7',
             'prayer_request','pending_review','group',
             '{"ja":"青年会へ"}'::jsonb,'{"ja":"祈ってください"}'::jsonb,'group') $$,
  '42501', null, '非所属者は group prayer を投稿できない');

-- 限定公開 devotion の通知は閲覧可能な会員だけに作られる。
select pg_temp.as_postgres();
select is(
  pg_temp.insert_pastor_only_devotion_notification_count(),
  1,
  'pastor_only devotion の通知は pastor/owner のみに作られる');

select throws_ok(
  $$ insert into public.content_items
       (church_id, author_membership_id, type, status, visibility, title, body, devotion_date)
     select church_id, author_membership_id, 'devotion', 'published', 'church',
            '{"ja":"同日重複"}'::jsonb, '{"ja":"本文"}'::jsonb, devotion_date
       from public.content_items
      where id = 'e1000000-0000-0000-0000-000000000001' $$,
  '23505', null, '同一教会・同一日の published devotion は重複できない');

select * from finish();
rollback;
