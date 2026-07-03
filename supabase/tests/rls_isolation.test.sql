-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ RLS 教会分離・権限テスト（pgTAP）  実行: npm run db:test              ║
-- ║ 04_Data Model §10 Security Test Cases（分離・書込権限・匿名拒否）      ║
-- ║ seed.sql の固定 UUID を利用する。                                      ║
-- ╚══════════════════════════════════════════════════════════════════════╝
begin;
select plan(17);

-- ── 認証切替ヘルパー ───────────────────────────────────────────────────
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

-- UUID: jimi=…e1(owner/pastor) ken=…e3(prayer_team) aoi=…e5(member) john=…d3(grace member)
-- eifuku=111… grace=222…

-- 1) 永福南オーナーは自教会のコンテンツを見られる
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1');
select ok(
  (select count(*) from public.content_items
     where church_id = '11111111-1111-1111-1111-111111111111') > 0,
  '永福南オーナーは自教会のコンテンツを閲覧できる');

-- 2) 永福南オーナーは Grace（別教会）のコンテンツを一切見られない
select is(
  (select count(*)::int from public.content_items
     where church_id = '22222222-2222-2222-2222-222222222222'),
  0, '永福南オーナーは Grace のコンテンツを閲覧できない（教会分離）');

-- 3) Grace 会員は永福南のコンテンツを見られない
select pg_temp.login('b0000000-0000-0000-0000-0000000000d3');
select is(
  (select count(*)::int from public.content_items
     where church_id = '11111111-1111-1111-1111-111111111111'),
  0, 'Grace 会員は永福南のコンテンツを閲覧できない');

-- 4) 永福南会員は Grace の祈祷課題を id 指定でも見られない
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5');
select is(
  (select count(*)::int from public.content_items
     where id = 'e2000000-0000-0000-0000-000000000011'),
  0, '永福南会員は Grace の祈祷課題を直接指定しても取得できない');

-- 5) 永福南会員は Grace のメンバー一覧を見られない
select is(
  (select count(*)::int from public.memberships
     where church_id = '22222222-2222-2222-2222-222222222222'),
  0, '永福南会員は Grace のメンバーを閲覧できない');

-- 6) 未認証(anon)はコンテンツ表にアクセスできない（permission denied）
select pg_temp.as_anon();
select throws_ok(
  $$ select count(*) from public.content_items $$,
  '42501', null, '未認証は content_items にアクセスできない');

-- 7) 未認証(anon)は churches にアクセスできない
select throws_ok(
  $$ select count(*) from public.churches $$,
  '42501', null, '未認証は churches にアクセスできない');

-- 8) 一般会員は祈祷課題を承認（moderation_reviews へ insert）できない
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi(member)
select throws_ok(
  $$ insert into public.moderation_reviews
       (content_item_id, church_id, reviewer_membership_id, decision)
     values ('e1000000-0000-0000-0000-000000000010',
             '11111111-1111-1111-1111-111111111111',
             'c1000000-0000-0000-0000-0000000000e5','approved') $$,
  '42501', null, '一般会員は祈祷課題を承認できない（ロール権限なし）');

-- 9) 祈祷チームは承認（moderation_reviews へ insert）できる
select pg_temp.login('a0000000-0000-0000-0000-0000000000e3'); -- ken(prayer_team)
select lives_ok(
  $$ insert into public.moderation_reviews
       (content_item_id, church_id, reviewer_membership_id, decision)
     values ('e1000000-0000-0000-0000-000000000010',
             '11111111-1111-1111-1111-111111111111',
             'c1000000-0000-0000-0000-0000000000e3','approved') $$,
  '祈祷チームは祈祷課題を承認できる');

-- 10) 牧師は他教会(Grace)にコンテンツを作成できない（整合性トリガーが先に拒否）
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi
select throws_ok(
  $$ insert into public.content_items
       (church_id, author_membership_id, type, status, visibility, title, body)
     values ('22222222-2222-2222-2222-222222222222',
             'c1000000-0000-0000-0000-0000000000e1',
             'devotion','draft','church','{}'::jsonb,'{}'::jsonb) $$,
  '23514', null, '牧師は別教会にコンテンツを作成できない');

-- 11) 牧師は自教会にコンテンツを作成できる
select lives_ok(
  $$ insert into public.content_items
       (church_id, author_membership_id, type, status, visibility, title, body)
     values ('11111111-1111-1111-1111-111111111111',
             'c1000000-0000-0000-0000-0000000000e1',
             'devotion','draft','church','{"ja":"新規"}'::jsonb,'{"ja":"本文"}'::jsonb) $$,
  '牧師は自教会にコンテンツを作成できる');

-- 12) 一般会員は他教会(Grace)の教会設定を更新できない（RLSで対象0行・変更なし）
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi
select lives_ok(
  $$ update public.churches set plan = 'free'
       where id = '22222222-2222-2222-2222-222222222222' $$,
  '会員による別教会の設定更新は実行してもエラーにならない（対象0行）');
select pg_temp.as_postgres();
select is(
  (select plan from public.churches where id = '22222222-2222-2222-2222-222222222222'),
  'pro', '別教会の設定は実際には変更されない（RLS がブロック）');

-- ── 承認制の DB 担保（自己公開/自己承認の禁止）─────────────────────────
-- 13) 一般会員は承認待ちの祈祷課題を投稿できる
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi(member)
select lives_ok(
  $$ insert into public.content_items
       (church_id, author_membership_id, type, status, visibility, title, body, requested_visibility)
     values ('11111111-1111-1111-1111-111111111111',
             'c1000000-0000-0000-0000-0000000000e5',
             'prayer_request','pending_review','prayer_team',
             '{"ja":"祈ってください"}'::jsonb,'{"ja":"本文"}'::jsonb,'church') $$,
  '一般会員は承認待ちの祈祷課題を投稿できる');

-- 14) 一般会員は published を直接作成できない（承認制を回避できない）
select throws_ok(
  $$ insert into public.content_items
       (church_id, author_membership_id, type, status, visibility, title, body)
     values ('11111111-1111-1111-1111-111111111111',
             'c1000000-0000-0000-0000-0000000000e5',
             'prayer_request','published','church',
             '{"ja":"直接公開"}'::jsonb,'{"ja":"本文"}'::jsonb) $$,
  '42501', null, '一般会員は published を直接作成できない（自己公開の禁止）');

-- 15) 作者は自分の pending_review を published へ自己承認できない
select pg_temp.login('a0000000-0000-0000-0000-0000000000e6'); -- emi（pending の作者）
select throws_ok(
  $$ update public.content_items set status='published'
       where id='e1000000-0000-0000-0000-000000000010' $$,
  '42501', null, '作者は自分の祈祷課題を自己承認（published化）できない');

-- 16) 越境: A教会のモデレータは B教会の課題のレビュー行を作れない（整合性トリガー）
select pg_temp.login('a0000000-0000-0000-0000-0000000000e3'); -- ken(prayer_team, 永福南)
select throws_ok(
  $$ insert into public.moderation_reviews
       (content_item_id, church_id, reviewer_membership_id, decision)
     values ('e2000000-0000-0000-0000-000000000011',
             '11111111-1111-1111-1111-111111111111',
             'c1000000-0000-0000-0000-0000000000e3','approved') $$,
  '23514', null, '越境: 親コンテンツと church_id 不一致のレビューは整合性トリガーが拒否');

select * from finish();
rollback;
