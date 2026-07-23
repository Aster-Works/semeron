-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ answered_testimony_grace_visibility                                   ║
-- ║ 期限切れの祈祷課題は会員から即座に隠れる（can_view_content）が、       ║
-- ║ 証しコメント（answered/thanksgiving + metadata.answered_at）が         ║
-- ║ 記録されてから1日だけは会衆にも見せる。感謝の報告を分かち合ってから   ║
-- ║ 静かに消えるため。アプリ層のフィード条件（feedFilters.notExpiredOr）  ║
-- ║ と同じ1日窓で、RLS とアプリの判定を一致させる。                       ║
-- ║ 20260705135614 の定義に「証しの1日猶予」だけを加えた差分。            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

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
      -- 証しコメントが記録されてから1日だけは、期限後でも会衆に見せる。
      if not (
        c.prayer_outcome in ('answered', 'thanksgiving')
        and (c.metadata ->> 'answered_at') is not null
        and (c.metadata ->> 'answered_at')::timestamptz > now() - interval '1 day'
      ) then
        return false;
      end if;
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
