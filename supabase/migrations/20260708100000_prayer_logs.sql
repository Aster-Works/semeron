-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ prayer_logs                                                           ║
-- ║ 「どの祈祷課題をいつ祈ったか」の個人の記録。教会ローカル日付で1日1件   ║
-- ║ （unique）。「祈りました」を押すと当日分が記録され、その日はボタンが  ║
-- ║ 「済」になる（翌日は再び押せる＝日次リセット）。                       ║
-- ║ 閲覧は本人のみ（completion_logs と同じ「個人の記録」パターン）。       ║
-- ║ 教会全体の「祈っています」集計は既存の reactions(type=prayed) を       ║
-- ║ そのまま使う（このテーブルはその上に日次履歴を足すだけ）。            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create table public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  prayed_at timestamptz not null default now(),
  prayed_date date not null,
  unique (content_item_id, membership_id, prayed_date)
);
create index prayer_logs_member_date_idx on public.prayer_logs (membership_id, prayed_date desc);

alter table public.prayer_logs enable row level security;

create policy prayer_logs_select on public.prayer_logs for select to authenticated
  using (membership_id = private.my_membership_id(church_id));
create policy prayer_logs_insert on public.prayer_logs for insert to authenticated
  with check (
    membership_id = private.my_membership_id(church_id)
    and private.can_view_content(content_item_id)
  );

grant select, insert on public.prayer_logs to authenticated;
revoke all on public.prayer_logs from anon;

-- church_id は親 content_item と一致しなければならない（既存の汎用トリガーを再利用）。
create trigger prayer_logs_church_match
  before insert or update on public.prayer_logs
  for each row execute function private.enforce_child_church();
