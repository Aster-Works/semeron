-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0005 notifications — イベント駆動の通知生成 + Web Push 購読ストア      ║
-- ║ 出典: 03 §7 Notifications / 07 Phase 4                                 ║
-- ║                                                                        ║
-- ║  - 承認/却下・祈りリアクション・デボーション公開で notifications 行を   ║
-- ║    自動生成（in_app）。トリガーは security definer で RLS を跨いで      ║
-- ║    受信者宛の通知を作る（送信キューは Edge/Route が処理する）。         ║
-- ║  - Web Push の購読情報を保存する push_subscriptions。                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── Web Push 購読 ──────────────────────────────────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_membership_idx on public.push_subscriptions (membership_id);

alter table public.push_subscriptions enable row level security;
-- 本人（自分の membership）だけが自分の購読を読み書きできる。
create policy push_select on public.push_subscriptions for select to authenticated
  using (membership_id = private.my_membership_id(church_id));
create policy push_insert on public.push_subscriptions for insert to authenticated
  with check (membership_id = private.my_membership_id(church_id));
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (membership_id = private.my_membership_id(church_id));

grant select, insert, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;
grant all on public.push_subscriptions to service_role;

-- ── 通知生成トリガー（private, security definer で RLS を跨ぐ）──────────

-- 承認/却下: pending_review → published/rejected の祈祷課題で、作者へ通知
create or replace function private.notify_on_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'prayer_request'
     and old.status = 'pending_review'
     and new.status in ('published','rejected')
     and new.author_membership_id is not null then
    insert into public.notifications
      (church_id, recipient_membership_id, type, channel, title, body, data)
    values (
      new.church_id, new.author_membership_id,
      case when new.status = 'published' then 'prayer_request_approved' else 'prayer_request_rejected' end,
      'in_app',
      case when new.status = 'published'
        then '{"ja":"祈祷課題が共有されました","en":"Your prayer request was shared"}'::jsonb
        else '{"ja":"祈祷課題は今回は共有されませんでした","en":"Your prayer request was not shared this time"}'::jsonb end,
      case when new.status = 'published'
        then '{"ja":"選んだ範囲に表示されました。","en":"It now appears to the visibility you chose."}'::jsonb
        else '{"ja":"牧師が個別にご連絡することがあります。","en":"A pastor may reach out to you."}'::jsonb end,
      jsonb_build_object('content_item_id', new.id)
    );
  end if;
  return new;
end; $$;
create trigger content_notify_moderation
  after update on public.content_items
  for each row execute function private.notify_on_moderation();

-- デボーション公開: 公開になった瞬間、教会のアクティブ会員全員へ
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
    where m.church_id = new.church_id and m.status = 'active';
  end if;
  return new;
end; $$;
create trigger content_notify_devotion
  after insert or update on public.content_items
  for each row execute function private.notify_on_devotion_publish();

-- 祈りリアクション: 自分以外が祈ったら、祈祷課題の作者へ通知
create or replace function private.notify_on_prayed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare author uuid;
begin
  if new.type = 'prayed' then
    select author_membership_id into author from public.content_items where id = new.content_item_id;
    if author is not null and author <> new.membership_id then
      insert into public.notifications
        (church_id, recipient_membership_id, type, channel, title, body, data)
      values (new.church_id, author, 'prayer_request_prayed', 'in_app',
        '{"ja":"あなたの祈祷課題が覚えられています","en":"Someone is praying with you"}'::jsonb,
        '{"ja":"誰かがあなたの祈祷課題のために祈りました。","en":"Someone prayed for your request."}'::jsonb,
        jsonb_build_object('content_item_id', new.content_item_id));
    end if;
  end if;
  return new;
end; $$;
create trigger reactions_notify_prayed
  after insert on public.reactions
  for each row execute function private.notify_on_prayed();
