-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ prayer_answered_testimony                                             ║
-- ║ 祈祷課題の投稿者が「答えられました／感謝の報告」を証しコメント付きで    ║
-- ║ 記録できるようにする。                                                 ║
-- ║                                                                        ║
-- ║ 方針:                                                                  ║
-- ║  - 変更は投稿者本人のみ・published の prayer_request に限る。          ║
-- ║  - author 列は authenticated から剥奪済みのため、判定は definer 内で    ║
-- ║    private.my_membership_id() と突き合わせる（RLS を緩めない）。       ║
-- ║  - 証し本文は metadata.answered_note（多言語 jsonb）に格納し、          ║
-- ║    content_feed 経由でそのまま読める（作者名は露出しない＝匿名維持）。  ║
-- ║  - open に戻す（取り消し）も可能。                                      ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create or replace function public.mark_prayer_answered(
  p_content uuid,
  p_outcome text,
  p_note jsonb default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.content_items;
  my uuid;
begin
  if p_outcome not in ('open', 'answered', 'thanksgiving') then
    raise exception 'invalid outcome';
  end if;

  select * into c from public.content_items
   where id = p_content and type = 'prayer_request';
  if not found then
    raise exception 'not found';
  end if;

  my := private.my_membership_id(c.church_id);
  if my is null or c.author_membership_id is distinct from my then
    raise exception 'not permitted';
  end if;

  -- 公開済みの課題だけを対象にする（承認待ち・却下・アーカイブは対象外）。
  if c.status <> 'published' then
    raise exception 'not published';
  end if;

  if p_outcome = 'open' then
    -- 取り消し: 状態を open に戻し、証しメタデータを消す。
    update public.content_items
       set prayer_outcome = 'open',
           metadata = (coalesce(metadata, '{}'::jsonb) - 'answered_note' - 'answered_at')
     where id = p_content;
  else
    update public.content_items
       set prayer_outcome = p_outcome,
           metadata = jsonb_set(
             jsonb_set(
               coalesce(metadata, '{}'::jsonb),
               '{answered_note}', coalesce(p_note, '{}'::jsonb), true
             ),
             '{answered_at}', to_jsonb(now()), true
           )
     where id = p_content;
  end if;
end;
$$;

-- 新規 public 関数は cloud 既定で PUBLIC(=anon 含む) に EXECUTE が付く。
-- 剥がして authenticated のみに限定する（security advisor を汚さない・匿名実行を封じる）。
revoke execute on function public.mark_prayer_answered(uuid, text, jsonb) from public, anon;
grant execute on function public.mark_prayer_answered(uuid, text, jsonb) to authenticated;
