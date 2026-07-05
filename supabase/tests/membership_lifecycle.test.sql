-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ Membership lifecycle regressions                                     ║
-- ║ 休止・退会・管理者による除外・通知対象除外の安全柵。                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝
begin;
select plan(25);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end; $$;

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end; $$;

create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end; $$;

create function pg_temp.seed_lifecycle_edges() returns void language plpgsql as $$
begin
  insert into public.push_subscriptions (church_id, membership_id, endpoint, p256dh, auth)
  values
    ('11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-0000000000e5',
     'https://push.example.test/aoi-lifecycle', 'p256dh-aoi', 'auth-aoi'),
    ('11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-0000000000e4',
     'https://push.example.test/yuki-lifecycle', 'p256dh-yuki', 'auth-yuki');
end; $$;

create temp table lifecycle_ids (
  key text primary key,
  id uuid not null
) on commit drop;

select pg_temp.as_postgres();
select pg_temp.seed_lifecycle_edges();

-- RPC grants: anon は所属変更RPCを実行できない。
select pg_temp.as_anon();
select throws_ok(
  $$ select public.leave_church('11111111-1111-1111-1111-111111111111'::uuid) $$,
  '42501', null, 'anon は leave_church を実行できない');
select throws_ok(
  $$ select public.remove_member_from_church(
       '11111111-1111-1111-1111-111111111111'::uuid,
       'c1000000-0000-0000-0000-0000000000e5'::uuid) $$,
  '42501', null, 'anon は remove_member_from_church を実行できない');

-- 権限境界。
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi: member
select throws_ok(
  $$ select public.remove_member_from_church(
       '11111111-1111-1111-1111-111111111111'::uuid,
       'c1000000-0000-0000-0000-0000000000e7'::uuid) $$,
  '42501', null, '一般会員は他メンバーを教会から外せない');

-- 招待コードは期限切れなら既存会員の再アクセスにも使えない。
select pg_temp.as_postgres();
update public.churches
   set invite_code_expires_at = now() - interval '1 minute'
 where id = '11111111-1111-1111-1111-111111111111';

select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi
select throws_ok(
  $$ select public.join_church('EIFUKU-2026', 'Jimi') $$,
  '22023', null, '期限切れの招待コードでは参加できない');

select pg_temp.as_postgres();
update public.churches
   set invite_code_expires_at = now() + interval '1 day'
 where id = '11111111-1111-1111-1111-111111111111';

select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi
select lives_ok(
  $$ select public.join_church('EIFUKU-2026', 'Jimi') $$,
  '期限内の招待コードは引き続き使える');

select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi: owner/pastor
select throws_ok(
  $$ select public.remove_member_from_church(
       '11111111-1111-1111-1111-111111111111'::uuid,
       'c1000000-0000-0000-0000-0000000000e1'::uuid) $$,
  '22023', null, '管理者除外RPCで自分自身を外せない');
select throws_ok(
  $$ select public.remove_member_from_church(
       '22222222-2222-2222-2222-222222222222'::uuid,
       'c2000000-0000-0000-0000-0000000000d3'::uuid) $$,
  '42501', null, '他教会のメンバーを外せない');

select pg_temp.login('b0000000-0000-0000-0000-0000000000d1'); -- david: Grace sole owner
select throws_ok(
  $$ select public.leave_church('22222222-2222-2222-2222-222222222222'::uuid) $$,
  '22023', null, '最後の active owner は退会できない');

-- 自己退会: removed 化し、運用エッジを掃除し、以後RLS上は非会員になる。
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi
select lives_ok(
  $$ select public.leave_church('11111111-1111-1111-1111-111111111111'::uuid) $$,
  '会員は自分で教会を抜けられる');

select pg_temp.as_postgres();
select is(
  (select status from public.memberships where id = 'c1000000-0000-0000-0000-0000000000e5'),
  'removed', 'leave_church は membership.status を removed にする');
select is(
  (select count(*)::int from public.group_memberships where membership_id = 'c1000000-0000-0000-0000-0000000000e5'),
  0, 'leave_church は group_memberships を削除する');
select is(
  (select count(*)::int from public.push_subscriptions where membership_id = 'c1000000-0000-0000-0000-0000000000e5'),
  0, 'leave_church は push_subscriptions を削除する');
select ok(
  exists (
    select 1 from public.audit_logs
    where action = 'member.left'
      and target_id = 'c1000000-0000-0000-0000-0000000000e5'
      and metadata->>'after' = 'removed'
  ),
  'leave_church は監査ログ member.left を残す');

select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- removed aoi
select is(
  (select count(*)::int from public.content_items
   where church_id = '11111111-1111-1111-1111-111111111111'),
  0, 'removed member は自教会コンテンツを読めない');
select is(
  (select count(*)::int from public.memberships
   where church_id = '11111111-1111-1111-1111-111111111111'),
  0, 'removed member は自教会メンバー一覧を読めない');
select throws_ok(
  $$ select public.join_church('EIFUKU-2026', 'Aoi Again') $$,
  '42501', null, 'removed member は招待コードだけでは復帰できない');

-- 管理者による除外: leader/group/push/audit を掃除する。
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi
select lives_ok(
  $$ select public.remove_member_from_church(
       '11111111-1111-1111-1111-111111111111'::uuid,
       'c1000000-0000-0000-0000-0000000000e4'::uuid) $$,
  'owner/pastor は自教会メンバーを外せる');

select pg_temp.as_postgres();
select is(
  (select status from public.memberships where id = 'c1000000-0000-0000-0000-0000000000e4'),
  'removed', 'remove_member_from_church は membership.status を removed にする');
select is(
  (select leader_membership_id from public.groups where id = 'd1000000-0000-0000-0000-000000000001'),
  null::uuid, 'グループリーダーを外したら leader_membership_id を null にする');
select is(
  (select count(*)::int from public.group_memberships where membership_id = 'c1000000-0000-0000-0000-0000000000e4'),
  0, 'remove_member_from_church は group_memberships を削除する');
select is(
  (select count(*)::int from public.push_subscriptions where membership_id = 'c1000000-0000-0000-0000-0000000000e4'),
  0, 'remove_member_from_church は push_subscriptions を削除する');
select ok(
  exists (
    select 1 from public.audit_logs
    where action = 'member.removed'
      and target_id = 'c1000000-0000-0000-0000-0000000000e4'
      and metadata->>'after' = 'removed'
  ),
  'remove_member_from_church は監査ログ member.removed を残す');

-- 通知生成は active member のみに限定する。
select pg_temp.as_postgres();
update public.memberships
   set status = 'inactive'
 where id = 'c1000000-0000-0000-0000-0000000000e7';

with inserted as (
  insert into public.content_items
    (church_id, author_membership_id, type, status, visibility, title, body, devotion_date)
  values
    ('11111111-1111-1111-1111-111111111111',
     'c1000000-0000-0000-0000-0000000000e1',
     'devotion', 'published', 'church',
     '{"ja":"ライフサイクル通知テスト"}'::jsonb,
     '{"ja":"本文"}'::jsonb,
     '2026-07-31')
  returning id
)
insert into lifecycle_ids (key, id)
select 'devotion', id from inserted;

select is(
  (select count(*)::int
     from public.notifications
    where data->>'content_item_id' = (select id::text from lifecycle_ids where key = 'devotion')),
  (select count(*)::int
     from public.memberships
    where church_id = '11111111-1111-1111-1111-111111111111'
      and status = 'active'),
  'published devotion の通知は active member 数と一致する');
select is(
  (select count(*)::int
     from public.notifications
    where data->>'content_item_id' = (select id::text from lifecycle_ids where key = 'devotion')
      and recipient_membership_id in (
        'c1000000-0000-0000-0000-0000000000e5',
        'c1000000-0000-0000-0000-0000000000e4',
        'c1000000-0000-0000-0000-0000000000e7'
      )),
  0, 'removed/inactive member には daily devotion 通知を作らない');
select ok(
  (select count(*)::int
     from public.notifications
    where data->>'content_item_id' = (select id::text from lifecycle_ids where key = 'devotion')) > 0,
  '通知トリガー自体は active member 向けに動いている');

select * from finish();
rollback;
