-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0002 security_helpers_and_rls                                          ║
-- ║ 認可ヘルパー（非公開スキーマ）＋ 全公開テーブルの RLS                  ║
-- ║ 出典: 04_Data Model and Security §4 Visibility / §5 Status / §6 RLS    ║
-- ║                                                                        ║
-- ║ 不変条件（04 §6）:                                                     ║
-- ║  - church_id を持つ表は「現在ユーザーの active membership」に基づく。   ║
-- ║  - auth.uid() が null なら拒否（ポリシーは TO authenticated）。         ║
-- ║  - `TO authenticated` だけで許可しない（必ず条件を伴う）。             ║
-- ║  - UPDATE は USING + WITH CHECK 両方を持つ。                            ║
-- ║  - 権限は user_metadata でなく membership_roles を正とする。            ║
-- ║  - ヘルパーは private スキーマ + security definer + search_path=''。     ║
-- ║    （RLS 越しに参照させず再帰を防ぐ）                                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create schema if not exists private;
grant usage on schema private to authenticated;

-- ── 認可ヘルパー ───────────────────────────────────────────────────────

-- 現在ユーザーの、対象教会における active な membership id（無ければ null）
create or replace function private.my_membership_id(target_church uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.memberships m
  where m.church_id = target_church
    and m.user_id = (select auth.uid())
    and m.status = 'active'
  limit 1;
$$;

create or replace function private.is_active_member(target_church uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.my_membership_id(target_church) is not null;
$$;

-- 対象教会内で、指定ロールのいずれかを持つ active member か
create or replace function private.has_church_role(target_church uuid, roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.membership_roles r on r.membership_id = m.id
    where m.church_id = target_church
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and r.role = any(roles)
  );
$$;

-- 管理領域アクセス（Dashboard 等）
create or replace function private.is_church_admin(target_church uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_church_role(target_church, array['owner','pastor','elder','staff']);
$$;

-- 祈祷課題をモデレーションできる（承認/却下/キュー閲覧）
create or replace function private.can_moderate(target_church uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_church_role(target_church, array['owner','pastor','elder','prayer_team']);
$$;

create or replace function private.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_memberships gm
    join public.memberships m on m.id = gm.membership_id
    where gm.group_id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function private.is_group_leader_of(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.groups g
    join public.memberships m on m.id = g.leader_membership_id
    where g.id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

-- profiles 用: 現在ユーザーと相手が同じ教会を共有するか
create or replace function private.shares_church(other_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships them on them.church_id = me.church_id
    where me.user_id = (select auth.uid()) and me.status = 'active'
      and them.user_id = other_user and them.status = 'active'
  );
$$;

-- ── 可視性の中核: この閲覧者はこのコンテンツを見られるか（04 §4/§5）────
-- Phase 1 の app/lib/demo/visibility.ts と同じ規則を DB 側で一元化する。
create or replace function private.can_view_content(content_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  c public.content_items;
  my uuid;
begin
  select * into c from public.content_items where id = content_id;
  if not found then return false; end if;

  my := private.my_membership_id(c.church_id);
  if my is null then return false; end if;              -- 非会員/別教会は拒否

  if c.author_membership_id = my then return true; end if; -- 作者は自分の投稿を常に閲覧可

  -- status ゲート
  if c.status = 'draft' then return private.is_church_admin(c.church_id); end if;
  if c.status = 'scheduled' then return private.is_church_admin(c.church_id); end if;
  if c.status = 'pending_review' then
    -- 04 §5: 承認前は「作者 + レビュアー」のみ（作者は上で判定済み）。
    -- センシティブな未承認内容の事前露出を防ぐため、レビュアー=can_moderate に限定する。
    return private.can_moderate(c.church_id);
  end if;
  if c.status = 'rejected' then return private.can_moderate(c.church_id); end if;
  if c.status = 'archived' then return private.is_church_admin(c.church_id); end if;

  if c.status = 'published' then
    -- 期限切れは会員リストから消える（管理者は監査のため可）
    if c.expires_at is not null and c.expires_at <= now()
       and not private.is_church_admin(c.church_id) then
      return false;
    end if;
    -- visibility ルール
    if c.visibility = 'pastor_only' then
      return private.has_church_role(c.church_id, array['owner','pastor']);
    elsif c.visibility = 'elders' then
      return private.has_church_role(c.church_id, array['owner','pastor','elder']);
    elsif c.visibility = 'prayer_team' then
      return private.has_church_role(c.church_id, array['owner','pastor','elder','prayer_team']);
    elsif c.visibility = 'group' then
      return (c.group_id is not null and private.is_group_member(c.group_id))
          or private.is_church_admin(c.church_id);
    elsif c.visibility in ('church','anonymous_church') then
      return true;  -- active member は my で担保済み
    end if;
    return false;
  end if;

  return false;
end; $$;

grant execute on function private.my_membership_id(uuid)        to authenticated;
grant execute on function private.is_active_member(uuid)        to authenticated;
grant execute on function private.has_church_role(uuid, text[]) to authenticated;
grant execute on function private.is_church_admin(uuid)         to authenticated;
grant execute on function private.can_moderate(uuid)            to authenticated;
grant execute on function private.is_group_member(uuid)         to authenticated;
grant execute on function private.is_group_leader_of(uuid)      to authenticated;
grant execute on function private.shares_church(uuid)           to authenticated;
grant execute on function private.can_view_content(uuid)        to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- RLS 有効化（全公開テーブル）
-- ════════════════════════════════════════════════════════════════════════
alter table public.churches           enable row level security;
alter table public.profiles           enable row level security;
alter table public.memberships        enable row level security;
alter table public.membership_roles   enable row level security;
alter table public.groups             enable row level security;
alter table public.group_memberships  enable row level security;
alter table public.content_items      enable row level security;
alter table public.moderation_reviews enable row level security;
alter table public.reactions          enable row level security;
alter table public.completion_logs    enable row level security;
alter table public.notifications      enable row level security;
alter table public.consent_records    enable row level security;
alter table public.audit_logs         enable row level security;

-- churches: 所属教会のみ閲覧。設定変更は owner/pastor。作成は Phase 3 の RPC。
create policy churches_select on public.churches for select to authenticated
  using (private.is_active_member(id));
create policy churches_update on public.churches for update to authenticated
  using (private.has_church_role(id, array['owner','pastor']))
  with check (private.has_church_role(id, array['owner','pastor']));

-- profiles: 自分、または教会を共有する相手のみ。更新は自分のみ。
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_church(user_id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- memberships: 所属教会の会員一覧は閲覧可。変更は管理者。
create policy memberships_select on public.memberships for select to authenticated
  using (private.is_active_member(church_id));
create policy memberships_insert on public.memberships for insert to authenticated
  with check (private.is_church_admin(church_id));
create policy memberships_update on public.memberships for update to authenticated
  using (private.is_church_admin(church_id))
  with check (private.is_church_admin(church_id));
create policy memberships_delete on public.memberships for delete to authenticated
  using (private.is_church_admin(church_id));

-- membership_roles: 所属教会内で閲覧可。付与/剥奪は管理者。
create policy membership_roles_select on public.membership_roles for select to authenticated
  using (exists (select 1 from public.memberships m
                 where m.id = membership_id and private.is_active_member(m.church_id)));
create policy membership_roles_write on public.membership_roles for all to authenticated
  using (exists (select 1 from public.memberships m
                 where m.id = membership_id and private.is_church_admin(m.church_id)))
  with check (exists (select 1 from public.memberships m
                      where m.id = membership_id and private.is_church_admin(m.church_id)));

-- groups / group_memberships: 閲覧は所属教会。変更は管理者。
create policy groups_select on public.groups for select to authenticated
  using (private.is_active_member(church_id));
create policy groups_write on public.groups for all to authenticated
  using (private.is_church_admin(church_id))
  with check (private.is_church_admin(church_id));

create policy group_memberships_select on public.group_memberships for select to authenticated
  using (exists (select 1 from public.groups g
                 where g.id = group_id and private.is_active_member(g.church_id)));
create policy group_memberships_write on public.group_memberships for all to authenticated
  using (exists (select 1 from public.groups g
                 where g.id = group_id and private.is_church_admin(g.church_id)))
  with check (exists (select 1 from public.groups g
                      where g.id = group_id and private.is_church_admin(g.church_id)));

-- content_items: 閲覧は can_view_content で一元判定。
--   作成は自教会の active member（作者=自分）。更新/削除は作者/モデレータ/管理者。
create policy content_select on public.content_items for select to authenticated
  using (private.can_view_content(id));
-- 作成: 自教会の active member（作者=自分）。ただし一般会員は draft/pending_review のみ。
--   published/scheduled 等の公開状態を作れるのはモデレータ/管理者だけ（承認制の担保）。
create policy content_insert on public.content_items for insert to authenticated
  with check (
    private.is_active_member(church_id)
    and author_membership_id = private.my_membership_id(church_id)
    and (
      private.can_moderate(church_id)
      or private.is_church_admin(church_id)
      or type = 'reflection'               -- 応答は会員が即時公開してよい（非モデレーション）
      or status in ('draft','pending_review')
    )
  );
-- 更新: 作者/モデレータ/管理者。ただし作者(のみ)は draft/pending_review へしか遷移できない。
--   published/rejected/archived への遷移（＝承認/却下/公開）はモデレータ/管理者に限る（自己承認の禁止）。
create policy content_update on public.content_items for update to authenticated
  using (
    author_membership_id = private.my_membership_id(church_id)
    or private.can_moderate(church_id)
    or private.is_church_admin(church_id)
  )
  with check (
    private.is_active_member(church_id)
    and (
      private.can_moderate(church_id)
      or private.is_church_admin(church_id)
      or (
        author_membership_id = private.my_membership_id(church_id)
        and (type = 'reflection' or status in ('draft','pending_review'))
      )
    )
  );
create policy content_delete on public.content_items for delete to authenticated
  using (
    author_membership_id = private.my_membership_id(church_id)
    or private.is_church_admin(church_id)
  );

-- moderation_reviews: 閲覧/作成はモデレータのみ。
create policy moderation_select on public.moderation_reviews for select to authenticated
  using (private.can_moderate(church_id));
create policy moderation_insert on public.moderation_reviews for insert to authenticated
  with check (
    private.can_moderate(church_id)
    and reviewer_membership_id = private.my_membership_id(church_id)
  );

-- reactions: 閲覧は「その内容が見える会員」。作成は自分の分のみ・見える内容に限る。削除は自分の分。
create policy reactions_select on public.reactions for select to authenticated
  using (private.is_active_member(church_id) and private.can_view_content(content_item_id));
create policy reactions_insert on public.reactions for insert to authenticated
  with check (
    membership_id = private.my_membership_id(church_id)
    and private.can_view_content(content_item_id)
  );
create policy reactions_delete on public.reactions for delete to authenticated
  using (membership_id = private.my_membership_id(church_id));

-- completion_logs: 本人のみ（管理者にも生ログは見せない。集計は関数経由）。
create policy completion_select on public.completion_logs for select to authenticated
  using (membership_id = private.my_membership_id(church_id));
create policy completion_insert on public.completion_logs for insert to authenticated
  with check (membership_id = private.my_membership_id(church_id));
create policy completion_update on public.completion_logs for update to authenticated
  using (membership_id = private.my_membership_id(church_id))
  with check (membership_id = private.my_membership_id(church_id));

-- notifications: 受信者本人、または管理者（通知画面）。作成は管理者。既読更新は本人。
create policy notifications_select on public.notifications for select to authenticated
  using (
    recipient_membership_id = private.my_membership_id(church_id)
    or private.is_church_admin(church_id)
  );
create policy notifications_insert on public.notifications for insert to authenticated
  with check (private.is_church_admin(church_id));
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_membership_id = private.my_membership_id(church_id))
  with check (recipient_membership_id = private.my_membership_id(church_id));

-- consent_records: 本人、または管理者（監査）。作成は本人。
create policy consent_select on public.consent_records for select to authenticated
  using (
    membership_id = private.my_membership_id(church_id)
    or private.is_church_admin(church_id)
  );
create policy consent_insert on public.consent_records for insert to authenticated
  with check (membership_id = private.my_membership_id(church_id));

-- audit_logs: 閲覧は管理者のみ。書き込みはモデレータ/管理者（actor=自分）。
create policy audit_select on public.audit_logs for select to authenticated
  using (private.is_church_admin(church_id));
create policy audit_insert on public.audit_logs for insert to authenticated
  with check (
    (private.can_moderate(church_id) or private.is_church_admin(church_id))
    and actor_membership_id = private.my_membership_id(church_id)
  );

-- ════════════════════════════════════════════════════════════════════════
-- content_feed ビュー: 会員向け読み取り。anonymous を尊重して作者を伏せる。
--   security_invoker=true → 基底表の RLS（content_select）がそのまま適用。
--   一般会員には author_membership_id を null にし、管理者・本人には残す。
-- ════════════════════════════════════════════════════════════════════════
create view public.content_feed with (security_invoker = true) as
select
  ci.id, ci.church_id, ci.group_id,
  case
    when (ci.visibility = 'anonymous_church' or ci.anonymous)
         and ci.author_membership_id is distinct from private.my_membership_id(ci.church_id)
         and not private.is_church_admin(ci.church_id)
    then null
    else ci.author_membership_id
  end as author_membership_id,
  ci.type, ci.status, ci.visibility,
  ci.title, ci.body,
  ci.scripture_reference, ci.scripture_translation, ci.scripture_quote, ci.copyright_notice,
  ci.reflection_question, ci.prayer_guide,
  ci.requested_visibility, ci.anonymous, ci.includes_third_party, ci.sensitive_flags,
  ci.prayer_outcome, ci.scheduled_at, ci.published_at, ci.expires_at, ci.devotion_date,
  ci.metadata, ci.created_at, ci.updated_at
from public.content_items ci;

grant select on public.content_feed to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 匿名集計: 管理者はデボーションの読了/祈り件数を「数」だけ取得できる。
--   生の completion_logs は本人以外に見せない（08 Analytics Policy）。
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.devotion_completion_counts(target_content uuid)
returns table (read_count bigint, prayed_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare ch uuid;
begin
  select church_id into ch from public.content_items where id = target_content;
  if ch is null or not private.is_church_admin(ch) then
    return;  -- 権限が無ければ空
  end if;
  return query
    select
      count(*) filter (where completed_read_at is not null),
      count(*) filter (where completed_prayed_at is not null)
    from public.completion_logs
    where content_item_id = target_content;
end; $$;
grant execute on function public.devotion_completion_counts(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- テーブル権限（GRANT）: RLS の前に「表アクセス権」が要る。
--   authenticated にのみ付与し、行の可否は上記 RLS が判定する。
--   anon には一切付与しない（未認証は permission denied）。
-- ════════════════════════════════════════════════════════════════════════
grant select, update                 on public.churches           to authenticated;
grant select, insert, update         on public.profiles           to authenticated;
grant select, insert, update, delete on public.memberships        to authenticated;
grant select, insert, update, delete on public.membership_roles   to authenticated;
grant select, insert, update, delete on public.groups             to authenticated;
grant select, insert, update, delete on public.group_memberships  to authenticated;
grant select, insert, update, delete on public.content_items      to authenticated;
grant select, insert                 on public.moderation_reviews to authenticated;
grant select, insert, delete         on public.reactions          to authenticated;
grant select, insert, update         on public.completion_logs    to authenticated;
grant select, insert, update         on public.notifications      to authenticated;
grant select, insert                 on public.consent_records    to authenticated;
grant select, insert                 on public.audit_logs         to authenticated;

revoke all on public.churches, public.profiles, public.memberships,
  public.membership_roles, public.groups, public.group_memberships,
  public.content_items, public.moderation_reviews, public.reactions,
  public.completion_logs, public.notifications, public.consent_records,
  public.audit_logs from anon;

-- service_role（管理/サーバー処理・RLS バイパス）には全権。
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines  in schema public to service_role;
