-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ group_delete_guard                                                   ║
-- ║ 小グループ祈祷課題などの履歴を孤立させないため、関連contentが残る      ║
-- ║ groupの物理削除をDB側で止める。空のグループは削除可能。               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create or replace function private.prevent_group_delete_with_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
      from public.content_items ci
     where ci.group_id = old.id
  ) then
    raise exception
      'group has content items; archive it instead'
      using errcode = '23503';
  end if;

  return old;
end;
$$;

drop trigger if exists groups_prevent_delete_with_content on public.groups;
create trigger groups_prevent_delete_with_content
  before delete on public.groups
  for each row execute function private.prevent_group_delete_with_content();
