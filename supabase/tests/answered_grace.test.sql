-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ answered_grace: 期限切れ×証しコメントの1日猶予（can_view_content）    ║
-- ║ e1…0017 = 期限切れ(2026-06-28)・published・church・作者taro(…e7)。    ║
-- ║ 会員aoi(…e5)の視点で: open=不可視 / 証し1日以内=可視 / 1日超=不可視。 ║
-- ╚══════════════════════════════════════════════════════════════════════╝
begin;
select plan(4);

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

create function pg_temp.aoi_sees_expired() returns integer language plpgsql as $$
declare n int;
begin
  perform pg_temp.login('a0000000-0000-0000-0000-0000000000e5');
  select count(*)::int into n from public.content_items
   where id = 'e1000000-0000-0000-0000-000000000017';
  perform pg_temp.as_postgres();
  return n;
end; $$;

-- 1) 期限切れ・open は会員に見えない（従来どおり）
select is(pg_temp.aoi_sees_expired(), 0, 'expired open prayer stays hidden from members');

-- 2) 証しコメントを今つける → 1日以内なので会員にも見える
update public.content_items
   set prayer_outcome = 'answered',
       metadata = jsonb_build_object(
         'answered_note', jsonb_build_object('ja','主が顧みてくださいました。'),
         'answered_at', to_jsonb(now()))
 where id = 'e1000000-0000-0000-0000-000000000017';
select is(pg_temp.aoi_sees_expired(), 1, 'expired prayer with fresh testimony is visible for a day');

-- 3) 証しから2日経過 → 消える
update public.content_items
   set metadata = jsonb_set(metadata, '{answered_at}', to_jsonb(now() - interval '2 days'))
 where id = 'e1000000-0000-0000-0000-000000000017';
select is(pg_temp.aoi_sees_expired(), 0, 'expired prayer with stale testimony is hidden again');

-- 4) 管理者(jimi)は証しの有無に関係なく期限切れを見られる（従来どおり）
create function pg_temp.jimi_sees_expired() returns integer language plpgsql as $$
declare n int;
begin
  perform pg_temp.login('a0000000-0000-0000-0000-0000000000e1');
  select count(*)::int into n from public.content_items
   where id = 'e1000000-0000-0000-0000-000000000017';
  perform pg_temp.as_postgres();
  return n;
end; $$;
select is(pg_temp.jimi_sees_expired(), 1, 'admins still see expired prayers regardless of testimony');

select * from finish();
rollback;
