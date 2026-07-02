-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0009 weekly_summary — 管理者向け週次サマリー（Roadmap Phase 3）        ║
-- ║                                                                        ║
-- ║ 過去7日の教会のあゆみを「匿名集計のみ」で1往復で返す。                 ║
-- ║ 04 §8 Analytics Policy 準拠: 個人別リスト・ランキング・信仰スコアは    ║
-- ║ 返さない。completion_logs は本人限定RLSのため、集計は definer で行い   ║
-- ║ is_church_admin を内部で必ず確認する（devotion_completion_counts と    ║
-- ║ 同じパターン）。                                                       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create or replace function public.weekly_summary(target_church uuid)
returns table (
  devotions_published bigint,
  read_count bigint,
  prayed_count bigint,
  reflection_count bigint,
  prayers_submitted bigint,
  prayers_approved bigint,
  prayers_pending bigint,
  new_members bigint
) language plpgsql stable security definer set search_path = '' as $$
declare
  since timestamptz := pg_catalog.now() - interval '7 days';
begin
  if not private.is_church_admin(target_church) then
    raise exception 'not authorized';
  end if;

  return query select
    (select count(*) from public.content_items c
      where c.church_id = target_church and c.type = 'devotion'
        and c.status = 'published' and c.published_at >= since),
    (select count(*) from public.completion_logs l
      where l.church_id = target_church and l.completed_read_at >= since),
    (select count(*) from public.completion_logs l
      where l.church_id = target_church and l.completed_prayed_at >= since),
    (select count(*) from public.content_items c
      where c.church_id = target_church and c.type = 'reflection'
        and c.created_at >= since),
    (select count(*) from public.content_items c
      where c.church_id = target_church and c.type = 'prayer_request'
        and c.created_at >= since),
    (select count(*) from public.moderation_reviews r
      where r.church_id = target_church and r.decision = 'approved'
        and r.created_at >= since),
    (select count(*) from public.content_items c
      where c.church_id = target_church and c.type = 'prayer_request'
        and c.status = 'pending_review'),
    (select count(*) from public.memberships m
      where m.church_id = target_church and m.status = 'active'
        and coalesce(m.joined_at, m.created_at) >= since);
end;
$$;

revoke execute on function public.weekly_summary(uuid) from public, anon;
grant execute on function public.weekly_summary(uuid) to authenticated;
