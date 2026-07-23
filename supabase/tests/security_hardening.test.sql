-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ security_hardening (2026-07 監査)                                     ║
-- ║  1) prayer_logs の本人限定・越境拒否・書込WITH CHECK                   ║
-- ║  2) anon への content_feed / prayer_logs / owns_content 権限剥奪の回帰 ║
-- ║ seed.sql の固定 UUID を利用する。実行: npm run db:test               ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- UUID: aoi=…e5(member), emi=…e6(member) は eifuku(111…)。john=…d3 は grace(222…)。
-- 祈祷課題: e1…0011=eifuku church-wide published, e2…0011=grace published。
begin;
select plan(8);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end; $$;

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('role','anon')::text, true);
  execute 'set local role anon';
end; $$;

create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end; $$;

-- 事前準備: emi(…e6) の祈祷ログを postgres 権限で1件作る（RLSバイパス）。
insert into public.prayer_logs (church_id, content_item_id, membership_id, prayed_date)
values ('11111111-1111-1111-1111-111111111111',
        'e1000000-0000-0000-0000-000000000011',
        'c1000000-0000-0000-0000-0000000000e6', current_date);

-- ── aoi(…e5) としてのテスト ─────────────────────────────────────────────
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5');

-- 1) 本人は、閲覧できる教会内の祈祷課題に対して当日ログを作成できる
select lives_ok($$
  insert into public.prayer_logs (church_id, content_item_id, membership_id, prayed_date)
  values ('11111111-1111-1111-1111-111111111111',
          'e1000000-0000-0000-0000-000000000011',
          'c1000000-0000-0000-0000-0000000000e5', current_date)
$$, 'member can log a prayer for viewable in-church content');

-- 2) 他人(emi)の membership_id で書けない（WITH CHECK 違反）
select throws_ok($$
  insert into public.prayer_logs (church_id, content_item_id, membership_id, prayed_date)
  values ('11111111-1111-1111-1111-111111111111',
          'e1000000-0000-0000-0000-000000000011',
          'c1000000-0000-0000-0000-0000000000e6', current_date + 1)
$$, '42501', NULL, 'member cannot insert a log under another member id');

-- 3) 越境: 別教会(grace)の課題に対してはログを作れない
select throws_ok($$
  insert into public.prayer_logs (church_id, content_item_id, membership_id, prayed_date)
  values ('22222222-2222-2222-2222-222222222222',
          'e2000000-0000-0000-0000-000000000011',
          'c1000000-0000-0000-0000-0000000000e5', current_date)
$$, NULL, 'member cannot log a prayer for another church''s content');

-- 4) 他人(emi)の祈祷ログは見えない（プライバシー）
select is(
  (select count(*)::int from public.prayer_logs
    where membership_id = 'c1000000-0000-0000-0000-0000000000e6'),
  0, 'member cannot see another member''s prayer logs');

-- 5) 自分の祈祷ログは見える
select is(
  (select count(*)::int from public.prayer_logs
    where membership_id = 'c1000000-0000-0000-0000-0000000000e5'),
  1, 'member can see their own prayer logs');

select pg_temp.as_postgres();

-- ── anon 権限剥奪の回帰テスト ───────────────────────────────────────────
select pg_temp.as_anon();

-- 6) anon は prayer_logs にアクセスできない（GRANT 無し）
select throws_ok($$ select 1 from public.prayer_logs limit 1 $$,
  '42501', NULL, 'anon has no access to prayer_logs');

-- 7) anon は content_feed を読めない（security_invoker → 基底表で拒否）
select throws_ok($$ select 1 from public.content_feed limit 1 $$,
  '42501', NULL, 'anon cannot read content_feed');

-- 8) anon は owns_content(definer) を実行できない
select throws_ok(
  $$ select public.owns_content('e1000000-0000-0000-0000-000000000011') $$,
  '42501', NULL, 'anon cannot execute owns_content');

select pg_temp.as_postgres();
select * from finish();
rollback;
