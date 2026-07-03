-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0016 prayer_anonymity_hardening                                        ║
-- ║ 祈祷課題の匿名性を「sticky・単一の真実・列レベルで堅牢」にする。        ║
-- ║                                                                        ║
-- ║ 背景（パイロットFB「匿名で投稿した祈祷課題が匿名になっていない」）:     ║
-- ║  (a) 匿名が anonymous(bool) と visibility='anonymous_church' の二重表現。║
-- ║      公開範囲カードで anonymous_church を選び anonymous トグルを押さない ║
-- ║      と anonymous=false。モデレーターが公開範囲を変えると匿名が剥がれ    ║
-- ║      作者が露出した（再現・確認済み）。                                 ║
-- ║  (b) さらに致命的: マスクは content_feed ビューだけで、基底表            ║
-- ║      content_items は authenticated に直接 SELECT 可能。RLS は行単位で   ║
-- ║      列を守らないため、会員は REST で content_items から               ║
-- ║      author_membership_id を直接読めた（＝ビューを迂回して匿名解除）。   ║
-- ║                                                                        ║
-- ║ 方針（Jimi 決定 2026-07-03 = 完全匿名）:                               ║
-- ║  1) 匿名は anonymous フラグを唯一の真実に（sticky・降格不可）。         ║
-- ║  2) 作者列を authenticated から列レベルで剥がし、作者の露出は           ║
-- ║     private.feed_author() 経由（＝完全匿名: 本人以外には出さない）に     ║
-- ║     一本化する。直接読みでも匿名は破れない。                            ║
-- ║  3) DB には帰属を保持（監査/安全対応は service_role のみ）。            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── (1) 匿名の sticky 化トリガ ─────────────────────────────────────────
create or replace function private.enforce_prayer_anonymity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type = 'prayer_request' then
    if new.visibility = 'anonymous_church'
       or new.requested_visibility = 'anonymous_church' then
      new.anonymous := true;
    end if;
    if tg_op = 'UPDATE' and coalesce(old.anonymous, false) and not coalesce(new.anonymous, false) then
      new.anonymous := true;  -- 降格禁止（作者の意図を保護）
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists content_items_enforce_anonymity on public.content_items;
create trigger content_items_enforce_anonymity
  before insert or update on public.content_items
  for each row execute function private.enforce_prayer_anonymity();

-- ── (2) 既存データの復元（希望に基づく backfill）───────────────────────
update public.content_items
set anonymous = true
where type = 'prayer_request'
  and anonymous is distinct from true
  and (visibility = 'anonymous_church' or requested_visibility = 'anonymous_church');

-- ── (3) 作者の可視判定を一元化する definer 関数（完全匿名）─────────────
-- 閲覧権(can_view_content)が無ければ何も返さない。作者本人には返す。
-- 匿名投稿は本人以外には（管理者・祈祷チームを含め）誰にも返さない。
-- security definer なので列レベルの剥奪後も content_items.author を参照できる。
create or replace function private.feed_author(content_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare c public.content_items; my uuid;
begin
  select * into c from public.content_items where id = content_id;
  if not found then return null; end if;
  if not private.can_view_content(content_id) then return null; end if;
  my := private.my_membership_id(c.church_id);
  if c.author_membership_id = my then return c.author_membership_id; end if;   -- 本人
  if c.anonymous or c.visibility = 'anonymous_church' then return null; end if; -- 完全匿名
  return c.author_membership_id;
end; $$;
grant execute on function private.feed_author(uuid) to authenticated;

-- ── (4) content_feed: 作者は feed_author 経由のみ（基底列を直接出さない）─
-- security_invoker=true → 行の可視は基底表 RLS(content_select) が担保。
-- author_membership_id は feed_author が完全匿名でマスクした値に置き換える。
create or replace view public.content_feed with (security_invoker = true) as
select
  ci.id, ci.church_id, ci.group_id,
  private.feed_author(ci.id) as author_membership_id,
  ci.type, ci.status, ci.visibility,
  ci.title, ci.body,
  ci.scripture_reference, ci.scripture_translation, ci.scripture_quote, ci.copyright_notice,
  ci.reflection_question, ci.prayer_guide,
  ci.requested_visibility, ci.anonymous, ci.includes_third_party, ci.sensitive_flags,
  ci.prayer_outcome, ci.scheduled_at, ci.published_at, ci.expires_at, ci.devotion_date,
  ci.metadata, ci.created_at, ci.updated_at
from public.content_items ci;

grant select on public.content_feed to authenticated;

-- ── (5) 作者列を authenticated から列レベルで剥がす ────────────────────
-- 会員は content_items から author_membership_id を直接読めない（REST 迂回を封じる）。
-- 他の列は従来どおり。書き込み(insert/update/delete)は据え置き（RLS が担保）。
-- service_role は grant all のため影響なし。作者の露出は content_feed のみ。
revoke select on public.content_items from authenticated;
grant select (
  id, church_id, group_id, type, status, visibility, title, body,
  scripture_reference, scripture_translation, scripture_quote, copyright_notice,
  reflection_question, prayer_guide, requested_visibility, anonymous, includes_third_party,
  sensitive_flags, prayer_outcome, scheduled_at, published_at, expires_at, devotion_date,
  metadata, created_at, updated_at
) on public.content_items to authenticated;

-- ── (6) 所有権チェック用 definer 関数（列剥奪後の server action 用）─────
-- 作者列を直接 select/filter できないため、本人判定はこの関数で行う。
create or replace function public.owns_content(content_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.content_items ci
    where ci.id = content_id
      and ci.author_membership_id = private.my_membership_id(ci.church_id)
  );
$$;
grant execute on function public.owns_content(uuid) to authenticated;

-- ── (7) 通知経由の匿名解除を封じる ─────────────────────────────────────
-- notifications は recipient_membership_id(=承認/却下通知では作者本人) と
-- data->>'content_item_id' を持つ。従来 notifications_select は管理者にも
-- 全通知を許していたため、管理者は content_item_id で作者を逆引きできた
-- （匿名投稿の author↔post 連結の露出＝完全匿名に反する）。
-- 対策: 閲覧は受信者本人のみに限定し、管理者の運用画面は「受信者・内容連結を
-- 含まない配信メタデータだけ」を返す definer RPC 経由にする。
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_membership_id = private.my_membership_id(church_id));

create or replace function public.church_notification_ops(
  target_church uuid,
  p_only_failed boolean default false
) returns table (
  id uuid, church_id uuid, type text, channel text,
  title jsonb, body jsonb, status text,
  scheduled_at timestamptz, sent_at timestamptz, failure_reason text,
  created_at timestamptz, read boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_church_admin(target_church) then
    return;  -- 管理者以外は空（recipient/data は一切返さない）
  end if;
  return query
    select n.id, n.church_id, n.type, n.channel,
           n.title, n.body, n.status,
           n.scheduled_at, n.sent_at, n.failure_reason,
           n.created_at, n.read
    from public.notifications n
    where n.church_id = target_church
      and (not p_only_failed or n.status = 'failed')
    order by n.created_at desc;
end; $$;
grant execute on function public.church_notification_ops(uuid, boolean) to authenticated;
