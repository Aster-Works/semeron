-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ RLS コンテンツ可視性テスト（pgTAP）  実行: npm run db:test            ║
-- ║ 04 §4 Visibility / §5 Status / §10 Security Test Cases                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝
begin;
select plan(33);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end; $$;

-- 見えるか（RLS 越しに id 指定で件数を数える）
create function pg_temp.sees(uid uuid, content uuid) returns integer
language plpgsql as $$
declare n int;
begin
  perform pg_temp.login(uid);
  select count(*)::int into n from public.content_items where id = content;
  return n;
end; $$;

-- 手動確認や別テストで seed の今日デボーションに completion_logs が増えても
-- 集計テストが揺れないよう、トランザクション内に専用デボーションを作る。
insert into public.content_items
  (id, church_id, author_membership_id, type, status, visibility, title, body, devotion_date)
values
  ('e1000000-0000-0000-0000-00000000f001',
   '11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e1',
   'devotion','published','church',
   '{"ja":"RLS集計テスト"}'::jsonb,'{"ja":"本文"}'::jsonb,'2099-07-06');

insert into public.completion_logs (church_id, content_item_id, membership_id, completed_read_at, completed_prayed_at) values
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-00000000f001','c1000000-0000-0000-0000-0000000000e5','2099-07-06T08:10:00+09:00','2099-07-06T08:10:00+09:00'),
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-00000000f001','c1000000-0000-0000-0000-0000000000e7','2099-07-06T08:20:00+09:00',null);

-- users: jimi e1(owner/pastor) hana e2(elder) ken e3(prayer_team)
--        yuki e4(leader) aoi e5(member,young) emi e6(member,author-pending) taro e7(member)
-- content: pending e…10 / prayer_team e…13 / pastor_only e…14 / group e…15
--          anon e…12 / rejected e…16 / expired e…17 / today e…01

-- ── pending_review: 作者 + レビュアーのみ ──────────────────────────────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e7','e1000000-0000-0000-0000-000000000010'),0,'pending: 一般会員は見えない');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e6','e1000000-0000-0000-0000-000000000010'),1,'pending: 作者は見える');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e3','e1000000-0000-0000-0000-000000000010'),1,'pending: 祈祷チームは見える');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e1','e1000000-0000-0000-0000-000000000010'),1,'pending: 牧師は見える');

-- ── prayer_team 公開範囲 ───────────────────────────────────────────────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e3','e1000000-0000-0000-0000-000000000013'),1,'prayer_team: 祈祷チームは見える');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e7','e1000000-0000-0000-0000-000000000013'),0,'prayer_team: 一般会員は見えない');

-- ── pastor_only（作者は taro） ─────────────────────────────────────────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e1','e1000000-0000-0000-0000-000000000014'),1,'pastor_only: 牧師は見える');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e2','e1000000-0000-0000-0000-000000000014'),0,'pastor_only: 長老は見えない');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e5','e1000000-0000-0000-0000-000000000014'),0,'pastor_only: 一般会員（非作者）は見えない');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e7','e1000000-0000-0000-0000-000000000014'),1,'pastor_only: 作者は自分の投稿を見える');

-- ── group（青年会） ────────────────────────────────────────────────────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e5','e1000000-0000-0000-0000-000000000015'),1,'group: グループ員は見える');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e7','e1000000-0000-0000-0000-000000000015'),0,'group: グループ外の会員は見えない');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e1','e1000000-0000-0000-0000-000000000015'),0,'group: 管理者でもグループ外なら published 投稿は見えない');
select pg_temp.login('a0000000-0000-0000-0000-0000000000e7'); -- taro (group outsider)
select is(
  (select count(*)::int from public.content_feed where id='e1000000-0000-0000-0000-000000000015'),
  0, 'group: content_feed でもグループ外には出ない');

-- ── anonymous_church: 行は見えるが作者は伏せる（content_feed） ─────────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e7','e1000000-0000-0000-0000-000000000012'),1,'anon: 会員に行は見える');

select pg_temp.login('a0000000-0000-0000-0000-0000000000e7'); -- taro (一般会員)
select is(
  (select author_membership_id from public.content_feed where id='e1000000-0000-0000-0000-000000000012'),
  null::uuid, 'anon: 一般会員には作者が伏せられる（content_feed）');

select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi (管理者)
select is(
  (select author_membership_id from public.content_feed where id='e1000000-0000-0000-0000-000000000012'),
  null::uuid, 'anon: 管理者にも作者は伏せられる（完全匿名）');

select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi (作者本人)
select isnt(
  (select author_membership_id from public.content_feed where id='e1000000-0000-0000-0000-000000000012'),
  null::uuid, 'anon: 作者本人には作者が見える');

-- ── rejected: 作者 + レビュアーのみ（作者は taro） ─────────────────────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e5','e1000000-0000-0000-0000-000000000016'),0,'rejected: 一般会員には決して見えない');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e7','e1000000-0000-0000-0000-000000000016'),1,'rejected: 作者は見える');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e1','e1000000-0000-0000-0000-000000000016'),1,'rejected: レビュアーは見える');

-- ── expired: 会員リストから消える。管理者は監査のため見える ────────────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e5','e1000000-0000-0000-0000-000000000017'),0,'expired: 会員には見えない');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e1','e1000000-0000-0000-0000-000000000017'),1,'expired: 管理者は見える');

-- ── completion_logs は本人のみ（管理者にも生ログは見せない）────────────
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi（自分の完了ログあり）
select is((select count(*)::int from public.completion_logs
           where content_item_id='e1000000-0000-0000-0000-00000000f001'),
          1, 'completion: 本人は自分の完了ログを見られる');
select pg_temp.login('a0000000-0000-0000-0000-0000000000e3'); -- ken（完了ログ無し）
select is((select count(*)::int from public.completion_logs
           where content_item_id='e1000000-0000-0000-0000-00000000f001'),
          0, 'completion: 他人の完了ログは見えない（2件あっても0）');
select pg_temp.login('a0000000-0000-0000-0000-0000000000e7'); -- taro（自分の分のみ）
select is((select count(*)::int from public.completion_logs
           where content_item_id='e1000000-0000-0000-0000-00000000f001'),
          1, 'completion: 本人は自分の分だけ見える（他人の分は含まれない）');

-- ── 匿名集計は管理者のみ。数だけ返る ───────────────────────────────────
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi(admin)
select is((select read_count from public.devotion_completion_counts('e1000000-0000-0000-0000-00000000f001')),
          2::bigint, 'aggregate: 管理者は読了数(2)を取得できる');
select is((select prayed_count from public.devotion_completion_counts('e1000000-0000-0000-0000-00000000f001')),
          1::bigint, 'aggregate: 管理者は祈り数(1)を取得できる');
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi(member)
select is_empty(
  $$ select * from public.devotion_completion_counts('e1000000-0000-0000-0000-00000000f001') $$,
  'aggregate: 一般会員は集計を取得できない（空）');

-- ── staff（管理者だがモデレータではない）: admin と moderator の境界 ────
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e8','e1000000-0000-0000-0000-000000000011'),1,'staff: 教会全体の公開課題は見える');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e8','e1000000-0000-0000-0000-000000000013'),0,'staff: prayer_team は見えない（staff は祈祷チームでない）');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e8','e1000000-0000-0000-0000-000000000010'),0,'staff: pending_review は見えない（管理者でもモデレータでなければ不可）');
select is(pg_temp.sees('a0000000-0000-0000-0000-0000000000e8','e1000000-0000-0000-0000-000000000003'),1,'staff: 下書き(draft)は管理者として見える');

select * from finish();
rollback;
