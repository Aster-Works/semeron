-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0014 membership_removed_and_leave_church — 教会所属から外す/抜ける   ║
-- ║                                                                        ║
-- ║ 方針: Auth user や履歴データは消さず、memberships.status='removed' へ ║
-- ║ 移す。自己退会はRLSを広げず、専用RPCで列更新を限定する。              ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create or replace function public.remove_member_from_church(
  p_church_id uuid,
  p_membership_id uuid
)
returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  actor_id uuid;
  target public.memberships;
  previous_status text;
  target_roles text[];
  remaining_owner_count integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select m.id into actor_id
    from public.memberships m
    where m.church_id = p_church_id
      and m.user_id = uid
      and m.status = 'active';

  if actor_id is null or not private.has_church_role(p_church_id, array['owner','pastor']) then
    raise exception 'owner/pastor role required' using errcode = '42501';
  end if;

  select * into target
    from public.memberships
    where id = p_membership_id and church_id = p_church_id
    for update;
  if not found then
    raise exception 'member not found' using errcode = '22023';
  end if;

  if target.id = actor_id then
    raise exception 'use leave church to remove yourself' using errcode = '22023';
  end if;

  if target.status = 'removed' then
    return target;
  end if;

  if target.status not in ('active', 'inactive', 'invited') then
    raise exception 'member not removable' using errcode = '22023';
  end if;

  select coalesce(array_agg(role), array[]::text[]) into target_roles
    from public.membership_roles
    where membership_id = target.id;

  if target.status = 'active' and target_roles @> array['owner']::text[] then
    select count(*) into remaining_owner_count
      from public.membership_roles mr
      join public.memberships m on m.id = mr.membership_id
      where mr.role = 'owner'
        and m.church_id = p_church_id
        and m.status = 'active'
        and m.id <> target.id;
    if remaining_owner_count = 0 then
      raise exception 'last owner' using errcode = '22023';
    end if;
  end if;

  previous_status := target.status;

  delete from public.push_subscriptions where membership_id = target.id;
  update public.groups set leader_membership_id = null where leader_membership_id = target.id;
  delete from public.group_memberships where membership_id = target.id;

  update public.memberships
     set status = 'removed'
   where id = target.id
   returning * into target;

  insert into public.audit_logs (
    church_id,
    actor_membership_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    p_church_id,
    actor_id,
    'member.removed',
    'membership',
    target.id,
    jsonb_build_object('before', previous_status, 'after', 'removed', 'roles', target_roles)
  );

  return target;
end; $$;

create or replace function public.leave_church(p_church_id uuid)
returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  target public.memberships;
  target_roles text[];
  remaining_owner_count integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into target
    from public.memberships
    where church_id = p_church_id
      and user_id = uid
      and status = 'active'
    for update;
  if not found then
    raise exception 'membership is not active' using errcode = '42501';
  end if;

  select coalesce(array_agg(role), array[]::text[]) into target_roles
    from public.membership_roles
    where membership_id = target.id;

  if target_roles @> array['owner']::text[] then
    select count(*) into remaining_owner_count
      from public.membership_roles mr
      join public.memberships m on m.id = mr.membership_id
      where mr.role = 'owner'
        and m.church_id = p_church_id
        and m.status = 'active'
        and m.id <> target.id;
    if remaining_owner_count = 0 then
      raise exception 'last owner' using errcode = '22023';
    end if;
  end if;

  delete from public.push_subscriptions where membership_id = target.id;
  update public.groups set leader_membership_id = null where leader_membership_id = target.id;
  delete from public.group_memberships where membership_id = target.id;

  update public.memberships
     set status = 'removed'
   where id = target.id
   returning * into target;

  insert into public.audit_logs (
    church_id,
    actor_membership_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    p_church_id,
    target.id,
    'member.left',
    'membership',
    target.id,
    jsonb_build_object('before', 'active', 'after', 'removed', 'roles', target_roles)
  );

  return target;
end; $$;

revoke execute on function public.remove_member_from_church(uuid, uuid) from public, anon;
revoke execute on function public.leave_church(uuid) from public, anon;
grant execute on function public.remove_member_from_church(uuid, uuid) to authenticated;
grant execute on function public.leave_church(uuid) to authenticated;
