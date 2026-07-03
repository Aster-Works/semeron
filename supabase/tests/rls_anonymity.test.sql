-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 匿名 sticky / 完全匿名 の回帰テスト（pgTAP）                          ║
-- ║ パイロットFB「匿名で投稿した祈祷課題が匿名になっていない」の再発防止。 ║
-- ║  1) anonymous_church を選べば anonymous=true が必ず立つ（トリガ）。     ║
-- ║  2) 公開範囲を church へ変えても匿名は降格せず作者はマスクされ続ける。  ║
-- ║  3) 完全匿名: 管理者・祈祷チームにも作者は出ない。作者本人だけ見える。  ║
-- ╚══════════════════════════════════════════════════════════════════════╝
begin;
select plan(13);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end; $$;

-- seed: church1=1111.. / author=aoi(member) c1..e5,user a0..e5
--       member(非作者)=emi a0..e6 / prayer_team=ken a0..e3 / pastor(admin)=jimi a0..e1
set local role postgres;

-- 匿名希望を「公開範囲カード」だけで表明（anonymous トグルは押していない = false）
insert into public.content_items
  (id, church_id, author_membership_id, type, status, visibility,
   title, body, requested_visibility, anonymous, published_at)
values
  ('fa000000-0000-0000-0000-0000000000a1','11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5','prayer_request','published','anonymous_church',
   '{"ja":"匿名希望"}','{"ja":"本文"}','anonymous_church', false, now());

-- 1) トリガが anonymous=true を強制している
select is(
  (select anonymous from public.content_items where id='fa000000-0000-0000-0000-0000000000a1'),
  true, 'trigger: anonymous_church を選ぶと anonymous=true が立つ');

-- 2) 一般会員(emi)には作者が伏せられている
select pg_temp.login('a0000000-0000-0000-0000-0000000000e6');
select is(
  (select author_membership_id from public.content_feed where id='fa000000-0000-0000-0000-0000000000a1'),
  null::uuid, '一般会員には作者が伏せられる');

-- 3) 【核心】モデレーターが公開範囲を church へ変更しても作者は露出しない
set local role postgres;
update public.content_items set visibility='church' where id='fa000000-0000-0000-0000-0000000000a1';
select is(
  (select anonymous from public.content_items where id='fa000000-0000-0000-0000-0000000000a1'),
  true, 'trigger: 公開範囲を変えても匿名は降格しない(sticky)');
select pg_temp.login('a0000000-0000-0000-0000-0000000000e6');
select is(
  (select author_membership_id from public.content_feed where id='fa000000-0000-0000-0000-0000000000a1'),
  null::uuid, '再スコープ後も一般会員には作者が伏せられる（漏洩しない）');

-- 4) 完全匿名: 祈祷チーム(ken)にも作者は出ない
select pg_temp.login('a0000000-0000-0000-0000-0000000000e3');
select is(
  (select author_membership_id from public.content_feed where id='fa000000-0000-0000-0000-0000000000a1'),
  null::uuid, '完全匿名: 祈祷チームにも作者は伏せられる');

-- 5) 完全匿名: 管理者(jimi)にも作者は出ない
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1');
select is(
  (select author_membership_id from public.content_feed where id='fa000000-0000-0000-0000-0000000000a1'),
  null::uuid, '完全匿名: 管理者にも作者は伏せられる');

-- 6) 作者本人(aoi)は自分の投稿の作者を見られる（編集/自分の投稿判定のため）
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5');
select is(
  (select author_membership_id from public.content_feed where id='fa000000-0000-0000-0000-0000000000a1'),
  'c1000000-0000-0000-0000-0000000000e5'::uuid, '作者本人には自分の投稿の作者が見える');

-- 7) 降格の直接試行も無効化される（anonymous を false に戻せない）
set local role postgres;
update public.content_items set anonymous=false where id='fa000000-0000-0000-0000-0000000000a1';
select is(
  (select anonymous from public.content_items where id='fa000000-0000-0000-0000-0000000000a1'),
  true, 'trigger: anonymous を false へ戻す更新は無効化される');

-- 8) 対照: 匿名でない church 投稿は作者が見える（過剰マスクの回帰防止）
set local role postgres;
insert into public.content_items
  (id, church_id, author_membership_id, type, status, visibility,
   title, body, requested_visibility, anonymous, published_at)
values
  ('fa000000-0000-0000-0000-0000000000a2','11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5','prayer_request','published','church',
   '{"ja":"実名OK"}','{"ja":"本文"}','church', false, now());
select pg_temp.login('a0000000-0000-0000-0000-0000000000e6');
select is(
  (select author_membership_id from public.content_feed where id='fa000000-0000-0000-0000-0000000000a2'),
  'c1000000-0000-0000-0000-0000000000e5'::uuid, '非匿名の投稿は作者が見える（過剰マスクなし）');

-- 9) 【核心の堅牢化】会員は基底表 content_items から作者列を直接読めない
--    （content_feed を迂回した REST 直読みでの匿名解除を封じる）。列レベル剥奪。
select pg_temp.login('a0000000-0000-0000-0000-0000000000e6');
select throws_ok(
  $$ select author_membership_id from public.content_items
       where id='fa000000-0000-0000-0000-0000000000a2' $$,
  '42501', null, '会員は content_items.author_membership_id を直接 select できない（列レベル拒否）');

-- ── 通知経由の匿名解除を封じる ─────────────────────────────────────────
-- 匿名投稿を承認すると作者宛の承認通知が作られる（recipient=作者, data=content_item_id）。
-- 管理者がこれを逆引きできないこと・作者本人は自分の通知を見られること・
-- 運用RPCは管理者以外に何も返さないことを確認する。
set local role postgres;
insert into public.content_items
  (id, church_id, author_membership_id, type, status, visibility, title, body, requested_visibility, anonymous)
values
  ('fb000000-0000-0000-0000-0000000000b1','11111111-1111-1111-1111-111111111111',
   'c1000000-0000-0000-0000-0000000000e5','prayer_request','pending_review','anonymous_church',
   '{"ja":"匿名承認テスト"}','{"ja":"本文"}','anonymous_church', true);
update public.content_items set status='published', published_at=now()
 where id='fb000000-0000-0000-0000-0000000000b1';  -- notify_on_moderation 発火 → 作者宛通知

-- 10) 管理者は通知から content_item_id→作者(recipient) を逆引きできない
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1'); -- jimi(admin)
select is(
  (select count(*)::int from public.notifications
    where data->>'content_item_id'='fb000000-0000-0000-0000-0000000000b1'),
  0, '管理者は他人宛の通知（匿名作者の逆引き）を読めない');

-- 11) 作者本人は自分宛の通知を読める（配信は機能する）
select pg_temp.login('a0000000-0000-0000-0000-0000000000e5'); -- aoi(author)
select is(
  (select count(*)::int from public.notifications
    where data->>'content_item_id'='fb000000-0000-0000-0000-0000000000b1'),
  1, '作者本人は自分宛の承認通知を読める');

-- 12) 運用RPCは非管理者には何も返さない
select pg_temp.login('a0000000-0000-0000-0000-0000000000e6'); -- emi(member)
select is(
  (select count(*)::int from public.church_notification_ops('11111111-1111-1111-1111-111111111111', false)),
  0, 'church_notification_ops は非管理者に空を返す');

select * from finish();
rollback;
