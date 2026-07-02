-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0010 role_write_owner_pastor — 役割変更を owner/pastor に限定          ║
-- ║                                                                        ║
-- ║ 従来の membership_roles_write は is_church_admin(=owner/pastor/elder/  ║
-- ║ staff)で、staff が自分に owner を付与できる権限昇格の余地があった。    ║
-- ║ 役割の付与/剥奪は教会設定と同じ owner/pastor 層に限定する               ║
-- ║ （churches_update と同一方針）。閲覧は従来どおり教会内。               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

drop policy if exists membership_roles_write on public.membership_roles;

create policy membership_roles_write on public.membership_roles for all to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.id = membership_id
      and private.has_church_role(m.church_id, array['owner','pastor'])
  ))
  with check (exists (
    select 1 from public.memberships m
    where m.id = membership_id
      and private.has_church_role(m.church_id, array['owner','pastor'])
  ));
