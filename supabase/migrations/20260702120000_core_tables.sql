-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0001 core_tables — Aster Daily コアスキーマ                            ║
-- ║ 出典: 04_Data Model and Security_Aster Daily.md                        ║
-- ║                                                                        ║
-- ║ 方針:                                                                  ║
-- ║  - すべての教会データは church_id で分離する。                        ║
-- ║  - User(auth.users) と Member(memberships) を分ける。                 ║
-- ║  - 多言語テキストは jsonb（言語コード→本文）。UI ロケール ja/en とは   ║
-- ║    独立し、教会ごとに配信言語をカスタムできる。                        ║
-- ║  - 種別/状態/公開範囲/ロールは text + CHECK（拡張しやすさ優先）。      ║
-- ║  - RLS は 0002 で有効化する（このファイルはテーブル定義のみ）。        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- 共通: updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end; $$;

-- ── churches ───────────────────────────────────────────────────────────
create table public.churches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name jsonb not null default '{}'::jsonb,
  default_locale text not null default 'ja' check (default_locale in ('ja','en')),
  content_languages text[] not null default array['ja'],
  timezone text not null default 'Asia/Tokyo',
  morning_notification_time time,
  status text not null default 'active' check (status in ('active','suspended')),
  soft_gate_mode text not null default 'gentle' check (soft_gate_mode in ('gentle','focused','off')),
  plan text not null default 'free' check (plan in ('free','small','standard','pro')),
  invite_code text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger churches_set_updated_at before update on public.churches
  for each row execute function public.set_updated_at();

-- ── profiles（auth.users に対応するアプリ内プロフィール）───────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_locale text not null default 'ja' check (preferred_locale in ('ja','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── memberships（User × Church）────────────────────────────────────────
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  email text,
  status text not null default 'active' check (status in ('invited','active','inactive','removed')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, user_id)
);
create index memberships_church_idx on public.memberships (church_id);
create index memberships_user_idx on public.memberships (user_id);
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- ── membership_roles（1メンバー複数ロール）─────────────────────────────
create table public.membership_roles (
  membership_id uuid not null references public.memberships(id) on delete cascade,
  role text not null check (role in
    ('owner','pastor','elder','staff','group_leader','prayer_team','member','guest')),
  primary key (membership_id, role)
);

-- ── groups / group_memberships ─────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name jsonb not null default '{}'::jsonb,
  description jsonb,
  leader_membership_id uuid references public.memberships(id) on delete set null,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);
create index groups_church_idx on public.groups (church_id);

create table public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  role text not null default 'member' check (role in ('member','leader')),
  joined_at timestamptz not null default now(),
  primary key (group_id, membership_id)
);
create index group_memberships_membership_idx on public.group_memberships (membership_id);

-- ── content_items（デボーション/祈祷課題/応答/証し/お知らせ共通）───────
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  author_membership_id uuid references public.memberships(id) on delete set null,
  type text not null check (type in
    ('devotion','prayer_request','reflection','testimony','announcement')),
  status text not null check (status in
    ('draft','scheduled','pending_review','published','rejected','archived')),
  visibility text not null check (visibility in
    ('pastor_only','elders','prayer_team','group','church','anonymous_church')),

  title jsonb not null default '{}'::jsonb,
  body jsonb not null default '{}'::jsonb,

  scripture_reference text,
  scripture_translation text,
  scripture_quote jsonb,
  copyright_notice text,

  reflection_question jsonb,
  prayer_guide jsonb,

  requested_visibility text check (requested_visibility in
    ('pastor_only','elders','prayer_team','group','church','anonymous_church')),
  anonymous boolean not null default false,
  includes_third_party boolean not null default false,
  sensitive_flags text[] not null default '{}',
  prayer_outcome text check (prayer_outcome in ('open','answered','thanksgiving')),

  scheduled_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  devotion_date date,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_church_type_status_idx on public.content_items (church_id, type, status);
create index content_group_idx on public.content_items (group_id);
create index content_author_idx on public.content_items (author_membership_id);
create index content_devotion_date_idx on public.content_items (church_id, devotion_date);
create trigger content_items_set_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

-- ── moderation_reviews ─────────────────────────────────────────────────
create table public.moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  reviewer_membership_id uuid references public.memberships(id) on delete set null,
  decision text not null check (decision in ('approved','rejected','needs_revision')),
  note text,
  created_at timestamptz not null default now()
);
create index moderation_content_idx on public.moderation_reviews (content_item_id);

-- ── reactions（amen/prayed/thanks/read）────────────────────────────────
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  type text not null check (type in ('amen','prayed','thanks','read')),
  created_at timestamptz not null default now(),
  unique (content_item_id, membership_id, type)
);
create index reactions_content_idx on public.reactions (content_item_id);

-- ── completion_logs（本人のみ・管理者には匿名集計のみ）─────────────────
create table public.completion_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  completed_read_at timestamptz,
  completed_prayed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (content_item_id, membership_id)
);
create index completion_membership_idx on public.completion_logs (membership_id);

-- ── notifications ──────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  recipient_membership_id uuid references public.memberships(id) on delete cascade,
  type text not null,
  channel text not null check (channel in ('in_app','email','web_push')),
  title jsonb not null default '{}'::jsonb,
  body jsonb,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  failure_reason text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_membership_id);
create index notifications_church_idx on public.notifications (church_id);

-- ── consent_records ────────────────────────────────────────────────────
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete cascade,
  consent_type text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- ── audit_logs（監査はプロダクト機能）──────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  actor_membership_id uuid references public.memberships(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_church_idx on public.audit_logs (church_id);
