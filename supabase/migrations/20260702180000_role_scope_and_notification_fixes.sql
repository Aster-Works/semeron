-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0008 role_scope_and_notification_fixes                               ║
-- ║  - prayer_team の権限を prayer_request に限定                         ║
-- ║  - group visibility は group_id と所属を伴う                           ║
-- ║  - completion_logs は閲覧可能な devotion のみ                          ║
-- ║  - 限定公開 devotion の通知は閲覧可能な会員だけへ                      ║
-- ║  - 同一教会・同一日付の published devotion は1件に制限                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── content_items write policies ─────────────────────────────────────

drop policy if exists content_insert on public.content_items;
drop policy if exists content_update on public.content_items;

create policy content_insert on public.content_items for insert to authenticated
  with check (
    private.is_active_member(church_id)
    and author_membership_id = private.my_membership_id(church_id)
    and (visibility = 'group' or group_id is null)
    and (visibility <> 'group' or group_id is not null)
    and (
      private.is_church_admin(church_id)
      or (
        type = 'prayer_request'
        and private.can_moderate(church_id)
      )
      or (
        type = 'prayer_request'
        and status = 'pending_review'
        and (visibility <> 'group' or private.is_group_member(group_id))
      )
      or (
        type = 'reflection'
        and status = 'published'
        and visibility = 'church'
      )
    )
  );

create policy content_update on public.content_items for update to authenticated
  using (
    private.is_church_admin(church_id)
    or (type = 'prayer_request' and private.can_moderate(church_id))
    or author_membership_id = private.my_membership_id(church_id)
  )
  with check (
    private.is_active_member(church_id)
    and (visibility = 'group' or group_id is null)
    and (visibility <> 'group' or group_id is not null)
    and (
      private.is_church_admin(church_id)
      or (
        type = 'prayer_request'
        and private.can_moderate(church_id)
      )
      or (
        author_membership_id = private.my_membership_id(church_id)
        and (
          (
            type = 'prayer_request'
            and status = 'pending_review'
            and (visibility <> 'group' or private.is_group_member(group_id))
          )
          or (
            type = 'reflection'
            and status = 'published'
            and visibility = 'church'
          )
        )
      )
    )
  );

-- ── completion_logs may only point at devotion rows the member can view ──

drop policy if exists completion_insert on public.completion_logs;
drop policy if exists completion_update on public.completion_logs;

create policy completion_insert on public.completion_logs for insert to authenticated
  with check (
    membership_id = private.my_membership_id(church_id)
    and private.can_view_content(content_item_id)
    and exists (
      select 1
      from public.content_items ci
      where ci.id = content_item_id
        and ci.church_id = completion_logs.church_id
        and ci.type = 'devotion'
    )
  );

create policy completion_update on public.completion_logs for update to authenticated
  using (membership_id = private.my_membership_id(church_id))
  with check (
    membership_id = private.my_membership_id(church_id)
    and private.can_view_content(content_item_id)
    and exists (
      select 1
      from public.content_items ci
      where ci.id = content_item_id
        and ci.church_id = completion_logs.church_id
        and ci.type = 'devotion'
    )
  );

-- ── devotion notification recipients follow content visibility ─────────

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
      jsonb_build_object('content_item_id', new.id)
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
          and (
            exists (
              select 1 from public.group_memberships gm
              where gm.group_id = new.group_id and gm.membership_id = m.id
            )
            or exists (
              select 1 from public.membership_roles r
              where r.membership_id = m.id and r.role in ('owner','pastor','elder','staff')
            )
          )
        )
      );
  end if;
  return new;
end; $$;

-- ── one published devotion per church day ─────────────────────────────

create unique index if not exists content_one_published_devotion_per_day_idx
  on public.content_items (church_id, devotion_date)
  where type = 'devotion'
    and status = 'published'
    and devotion_date is not null;
