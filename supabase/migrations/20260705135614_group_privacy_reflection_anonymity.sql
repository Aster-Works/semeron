-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ group_privacy_reflection_anonymity                                  ║
-- ║  - 小グループ向け published content は作者本人 + 当該グループ所属者   ║
-- ║    だけに通常閲覧を限定する。                                         ║
-- ║  - グループ一覧/メンバー一覧も、会員側では当該グループ所属者に限定。   ║
-- ║    管理画面用に church admin は group metadata / membership を読める。 ║
-- ║  - デボーション応答(reflection)は既存分も今後分も匿名表示に固定する。  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── Content visibility: published group content is group-only ─────────
create or replace function private.can_view_content(content_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  c public.content_items;
  my uuid;
begin
  select * into c from public.content_items where id = content_id;
  if not found then return false; end if;

  my := private.my_membership_id(c.church_id);
  if my is null then return false; end if;

  if c.author_membership_id = my then return true; end if;

  if c.status = 'draft' then return private.is_church_admin(c.church_id); end if;
  if c.status = 'scheduled' then return private.is_church_admin(c.church_id); end if;
  if c.status = 'pending_review' then
    return private.can_moderate(c.church_id);
  end if;
  if c.status = 'rejected' then return private.can_moderate(c.church_id); end if;
  if c.status = 'archived' then return private.is_church_admin(c.church_id); end if;

  if c.status = 'published' then
    if c.expires_at is not null and c.expires_at <= now()
       and not private.is_church_admin(c.church_id) then
      return false;
    end if;

    if c.visibility = 'pastor_only' then
      return private.has_church_role(c.church_id, array['owner','pastor']);
    elsif c.visibility = 'elders' then
      return private.has_church_role(c.church_id, array['owner','pastor','elder']);
    elsif c.visibility = 'prayer_team' then
      return private.has_church_role(c.church_id, array['owner','pastor','elder','prayer_team']);
    elsif c.visibility = 'group' then
      return c.group_id is not null and private.is_group_member(c.group_id);
    elsif c.visibility in ('church','anonymous_church') then
      return true;
    end if;
    return false;
  end if;

  return false;
end; $$;

-- ── Group metadata visibility: member-facing routes are group-only ────
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (private.is_church_admin(church_id) or private.is_group_member(id));

drop policy if exists group_memberships_select on public.group_memberships;
create policy group_memberships_select on public.group_memberships for select to authenticated
  using (
    exists (
      select 1
      from public.groups g
      where g.id = group_id
        and (private.is_church_admin(g.church_id) or private.is_group_member(g.id))
    )
  );

-- ── Reflection anonymity: existing and future responses are anonymous ──
create or replace function private.enforce_prayer_anonymity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type = 'reflection' then
    new.anonymous := true;
  elsif new.type = 'prayer_request' then
    if new.visibility = 'anonymous_church'
       or new.requested_visibility = 'anonymous_church' then
      new.anonymous := true;
    end if;
    if tg_op = 'UPDATE' and coalesce(old.anonymous, false) and not coalesce(new.anonymous, false) then
      new.anonymous := true;
    end if;
  end if;
  return new;
end; $$;

update public.content_items
set anonymous = true
where type = 'reflection'
  and anonymous is distinct from true;

create or replace function private.feed_author(content_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare c public.content_items; my uuid;
begin
  select * into c from public.content_items where id = content_id;
  if not found then return null; end if;
  if not private.can_view_content(content_id) then return null; end if;

  -- デボーションへの応答は、本人・管理者を含めて表示上は常に匿名。
  if c.type = 'reflection' then return null; end if;

  my := private.my_membership_id(c.church_id);
  if c.author_membership_id = my then return c.author_membership_id; end if;
  if c.anonymous or c.visibility = 'anonymous_church' then return null; end if;
  return c.author_membership_id;
end; $$;

-- ── Group devotion notifications follow group-only visibility ─────────
create or replace function private.notify_on_devotion_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'devotion' and new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.notifications
      (church_id, recipient_membership_id, type, channel, title, body, data)
    select new.church_id, m.id, 'daily_devotion_published', 'in_app',
      '{"ja":"今日のみことばが届きました","en":"Today''s Word has arrived"}'::jsonb,
      new.title,
      private.notification_data(new.church_id, new.id, 'daily_devotion_published')
    from public.memberships m
    where m.church_id = new.church_id
      and m.status = 'active'
      and (
        new.visibility in ('church', 'anonymous_church')
        or (
          new.visibility = 'pastor_only'
          and exists (
            select 1 from public.membership_roles r
            where r.membership_id = m.id and r.role in ('owner','pastor')
          )
        )
        or (
          new.visibility = 'elders'
          and exists (
            select 1 from public.membership_roles r
            where r.membership_id = m.id and r.role in ('owner','pastor','elder')
          )
        )
        or (
          new.visibility = 'prayer_team'
          and exists (
            select 1 from public.membership_roles r
            where r.membership_id = m.id and r.role in ('owner','pastor','elder','prayer_team')
          )
        )
        or (
          new.visibility = 'group'
          and new.group_id is not null
          and exists (
            select 1 from public.group_memberships gm
            where gm.group_id = new.group_id and gm.membership_id = m.id
          )
        )
      );
  end if;
  return new;
end; $$;
