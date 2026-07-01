-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0003 integrity_triggers — 教会境界の整合性トリガー                     ║
-- ║                                                                        ║
-- ║ RLS は「誰が行を読めるか」を守るが、テナント越境の“書き込み整合性”は    ║
-- ║ トリガーで担保する（RLS レビュー指摘への対応）:                        ║
-- ║  - moderation_reviews / reactions / completion_logs の church_id は     ║
-- ║    親 content_item の church_id と一致しなければならない。              ║
-- ║  - content_items.group_id を持つ場合、その group は同一教会でなければ   ║
-- ║    ならない。                                                          ║
-- ║ これにより「B教会のモデレータが A教会の課題のレビュー行を作る」等の     ║
-- ║ 越境データ混入を防ぐ。                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- 子テーブル(church_id, content_item_id を持つ)の church 一致を強制
create or replace function private.enforce_child_church()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_church uuid;
begin
  select church_id into parent_church
    from public.content_items where id = new.content_item_id;
  if parent_church is null or new.church_id is distinct from parent_church then
    raise exception
      'church_id (%) must match the parent content_item church (%)',
      new.church_id, parent_church
      using errcode = '23514';  -- check_violation
  end if;
  return new;
end; $$;

create trigger moderation_reviews_church_match
  before insert or update on public.moderation_reviews
  for each row execute function private.enforce_child_church();

create trigger reactions_church_match
  before insert or update on public.reactions
  for each row execute function private.enforce_child_church();

create trigger completion_logs_church_match
  before insert or update on public.completion_logs
  for each row execute function private.enforce_child_church();

-- content_items.group_id は同一教会のグループでなければならない
create or replace function private.enforce_content_group_church()
returns trigger language plpgsql security definer set search_path = '' as $$
declare grp_church uuid;
begin
  if new.group_id is not null then
    select church_id into grp_church from public.groups where id = new.group_id;
    if grp_church is null or grp_church is distinct from new.church_id then
      raise exception
        'group_id must belong to the same church as the content item'
        using errcode = '23514';
    end if;
  end if;
  return new;
end; $$;

create trigger content_items_group_church_match
  before insert or update on public.content_items
  for each row execute function private.enforce_content_group_church();
