"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/app/lib/supabase/server";
import type { Locale, ReactionType, Visibility } from "@/app/lib/demo/types";

export type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

const CHURCH_ADMIN_ROLES = new Set(["owner", "pastor", "elder", "staff"]);
const MEMBER_MANAGER_ROLES = new Set(["owner", "pastor"]);
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function myMembership(
  supabase: SupabaseClient,
  churchId: string,
): Promise<{ id: string; roles: string[] } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("memberships")
    .select("id, membership_roles(role)")
    .eq("church_id", churchId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data?.id) return null;
  return {
    id: data.id,
    roles: ((data.membership_roles ?? []) as { role: string }[]).map((r) => r.role),
  };
}

async function myMembershipId(supabase: SupabaseClient, churchId: string): Promise<string | null> {
  return (await myMembership(supabase, churchId))?.id ?? null;
}

function isChurchAdminRole(roles: string[]): boolean {
  return roles.some((role) => CHURCH_ADMIN_ROLES.has(role));
}

function canManageMembers(roles: string[]): boolean {
  return roles.some((role) => MEMBER_MANAGER_ROLES.has(role));
}

function normalizeDateKey(value?: string | null): string | null {
  if (!value) return null;
  return DATE_KEY_RE.test(value) ? value : null;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}

function zonedDateTimeToUtcIso(
  dateKey: string,
  time: { hour: number; minute: number; second?: number; ms?: number },
  timeZone: string,
): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const wallClockUtc = Date.UTC(
    year,
    month - 1,
    day,
    time.hour,
    time.minute,
    time.second ?? 0,
    time.ms ?? 0,
  );
  try {
    const first = wallClockUtc - timeZoneOffsetMs(new Date(wallClockUtc), timeZone);
    const second = wallClockUtc - timeZoneOffsetMs(new Date(first), timeZone);
    return new Date(second).toISOString();
  } catch {
    return new Date(wallClockUtc).toISOString();
  }
}

function parseMorningTime(value?: string | null): { hour: number; minute: number } {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hour: 6, minute: 30 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

async function getChurchTiming(
  supabase: SupabaseClient,
  churchId: string,
): Promise<{ timezone: string; morningTime: string | null }> {
  const { data } = await supabase
    .from("churches")
    .select("timezone, morning_notification_time")
    .eq("id", churchId)
    .maybeSingle();
  return {
    timezone: data?.timezone ?? "UTC",
    morningTime: data?.morning_notification_time ?? null,
  };
}

function expiryDateToIso(dateKey: string | null, timeZone: string): string | null {
  if (!dateKey) return null;
  return zonedDateTimeToUtcIso(dateKey, { hour: 23, minute: 59, second: 59, ms: 999 }, timeZone);
}

function scheduleDateToIso(dateKey: string | null, timeZone: string, morningTime: string | null): string | null {
  if (!dateKey) return null;
  return zonedDateTimeToUtcIso(dateKey, parseMorningTime(morningTime), timeZone);
}

/* ---------- Auth ---------- */
export async function signInWithPassword(email: string, password: string): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * パスワードでの新規登録（マジックリンクは廃止済み）。
 * autoconfirm 前提で即セッションが張られる。教会への所属は招待コードが実際のゲート。
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  nextPath?: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  // 招待リンク経由の登録では、確認メールのリンク先に招待コンテキストを載せる。
  // (テンプレートが rt={{ .RedirectTo }} を /auth/callback へ渡し、callback が
  //  同一オリジン検証のうえ next として復元する)
  // nextPath は相対パスのみ許可（オープンリダイレクト防止）。
  const safe =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.startsWith("/\\")
      ? nextPath
      : null;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const emailRedirectTo = safe && base ? `${base}${safe}` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error) return { ok: false, error: error.message };
  // 本番はメール確認必須(autoconfirm off)のためセッションは張られない。
  // その場合は「確認メールを送信した」ことを成功として返し、UI が案内を表示する。
  // (ローカル開発は autoconfirm on のため needsConfirmation=false で即ログイン)
  return { ok: true, data: { needsConfirmation: !data.session } };
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return { ok: true };
}

/* ---------- Onboarding ---------- */
export async function createChurch(input: {
  name: string;
  slug: string;
  displayName: string;
  defaultLocale: Locale;
  timezone: string;
  inviteCode?: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("create_church", {
    p_name: { [input.defaultLocale]: input.name },
    p_slug: input.slug,
    p_display_name: input.displayName,
    p_default_locale: input.defaultLocale,
    p_content_languages: [input.defaultLocale],
    p_timezone: input.timezone,
    p_invite_code: input.inviteCode ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const rows = data as { slug?: string } | { slug?: string }[] | null;
  const slug = Array.isArray(rows) ? rows[0]?.slug : rows?.slug;
  return { ok: true, data: { slug } };
}

export async function joinChurch(inviteCode: string, displayName: string): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("join_church", {
    p_invite_code: inviteCode,
    p_display_name: displayName,
  });
  if (error) return { ok: false, error: error.message };
  const rows = data as { slug?: string } | { slug?: string }[] | null;
  const slug = Array.isArray(rows) ? rows[0]?.slug : rows?.slug;
  return { ok: true, data: { slug } };
}

/* ---------- Member: completion / reactions / reflection ---------- */
export async function setCompletion(
  churchId: string,
  contentId: string,
  kind: "read" | "prayed",
  value: boolean,
): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, churchId);
  if (!membershipId) return { ok: false, error: "not a member" };
  const { data: content } = await supabase
    .from("content_items")
    .select("id")
    .eq("id", contentId)
    .eq("church_id", churchId)
    .eq("type", "devotion")
    .eq("status", "published")
    .maybeSingle();
  if (!content) return { ok: false, error: "not found or not permitted" };
  const col = kind === "read" ? "completed_read_at" : "completed_prayed_at";
  const { error } = await supabase.from("completion_logs").upsert(
    {
      church_id: churchId,
      content_item_id: contentId,
      membership_id: membershipId,
      [col]: value ? new Date().toISOString() : null,
    },
    { onConflict: "content_item_id,membership_id" },
  );
  if (error) return { ok: false, error: error.message };
  // 30秒ルーターキャッシュ(staleTimes)を無効化し、再訪時に最新状態を取得させる
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleReaction(
  churchId: string,
  contentId: string,
  type: ReactionType,
): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, churchId);
  if (!membershipId) return { ok: false, error: "not a member" };
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("content_item_id", contentId)
    .eq("membership_id", membershipId)
    .eq("type", type)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    // 30秒ルーターキャッシュ(staleTimes)を無効化（トグルの再訪反転を防ぐ）
    revalidatePath("/", "layout");
    return { ok: true, data: { active: false } };
  }
  const { error } = await supabase
    .from("reactions")
    .insert({ church_id: churchId, content_item_id: contentId, membership_id: membershipId, type });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: { active: true } };
}

export async function postReflection(
  churchId: string,
  churchSlug: string,
  locale: Locale,
  body: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, churchId);
  if (!membershipId) return { ok: false, error: "not a member" };
  const { error } = await supabase.from("content_items").insert({
    church_id: churchId,
    author_membership_id: membershipId,
    type: "reflection",
    status: "published",
    visibility: "church",
    title: {},
    body: { [locale]: body },
    published_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/church/${churchSlug}/today`);
  return { ok: true };
}

/* ---------- Prayer requests ---------- */
export async function submitPrayerRequest(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  title: string;
  body: string;
  visibility: Visibility;
  anonymous: boolean;
  includesThirdParty: boolean;
  groupId?: string | null;
  expiresAt?: string | null;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  let groupId: string | null = null;
  if (input.visibility === "group") {
    if (!input.groupId) return { ok: false, error: "group required" };
    const { data: groupMembership } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("group_id", input.groupId)
      .eq("membership_id", membershipId)
      .maybeSingle();
    if (!groupMembership) return { ok: false, error: "not a group member" };
    groupId = input.groupId;
  }

  const timing = await getChurchTiming(supabase, input.churchId);
  const expiresAt = expiryDateToIso(normalizeDateKey(input.expiresAt), timing.timezone);
  const { error } = await supabase.from("content_items").insert({
    church_id: input.churchId,
    group_id: groupId,
    author_membership_id: membershipId,
    type: "prayer_request",
    status: "pending_review",
    visibility: input.visibility,
    requested_visibility: input.visibility,
    title: { [input.locale]: input.title },
    body: { [input.locale]: input.body },
    anonymous: input.anonymous,
    includes_third_party: input.includesThirdParty,
    expires_at: expiresAt,
    prayer_outcome: "open",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/prayers`);
  return { ok: true };
}

export async function moderatePrayer(input: {
  churchSlug: string;
  locale: Locale;
  contentId: string;
  decision: "approved" | "rejected" | "needs_revision";
  visibility?: Visibility;
  publicTitle?: string;
  publicBody?: string;
  note?: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("moderate_prayer", {
    p_content: input.contentId,
    p_decision: input.decision,
    p_visibility: input.visibility ?? null,
    p_public_title: input.publicTitle ? { [input.locale]: input.publicTitle } : null,
    p_public_body: input.publicBody ? { [input.locale]: input.publicBody } : null,
    p_note: input.note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/prayer-requests`);
  return { ok: true };
}

/* ---------- Devotion CRUD ---------- */
export async function saveDevotion(input: {
  id?: string;
  churchId: string;
  churchSlug: string;
  locale: Locale;
  status: "draft" | "scheduled" | "published";
  devotionDate?: string | null;
  scheduledAt?: string | null;
  visibility: Visibility;
  scriptureReference?: string;
  scriptureTranslation?: string;
  scriptureQuote?: Record<string, string>;
  title: Record<string, string>;
  body: Record<string, string>;
  reflectionQuestion?: Record<string, string>;
  prayerGuide?: Record<string, string>;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membership = await myMembership(supabase, input.churchId);
  if (!membership) return { ok: false, error: "not a member" };
  if (!isChurchAdminRole(membership.roles)) return { ok: false, error: "not permitted" };

  const timing = await getChurchTiming(supabase, input.churchId);
  const scheduledDate = normalizeDateKey(input.scheduledAt);
  const devotionDate = normalizeDateKey(input.devotionDate) ?? scheduledDate;
  if (input.status === "scheduled" && !scheduledDate) {
    return { ok: false, error: "schedule date required" };
  }

  const row = {
    church_id: input.churchId,
    group_id: null,
    author_membership_id: membership.id,
    type: "devotion" as const,
    status: input.status,
    visibility: input.visibility,
    devotion_date: devotionDate,
    scheduled_at:
      input.status === "scheduled"
        ? scheduleDateToIso(scheduledDate, timing.timezone, timing.morningTime)
        : null,
    published_at: input.status === "published" ? new Date().toISOString() : null,
    scripture_reference: input.scriptureReference || null,
    scripture_translation: input.scriptureTranslation || null,
    scripture_quote: input.scriptureQuote ?? {},
    title: input.title,
    body: input.body,
    reflection_question: input.reflectionQuestion ?? {},
    prayer_guide: input.prayerGuide ?? {},
  };

  const res = input.id
    ? await supabase.from("content_items").update(row).eq("id", input.id)
    : await supabase.from("content_items").insert(row);
  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/devotions`);
  return { ok: true };
}

/* ---------- Web Push 購読（Phase 4）---------- */
export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

/**
 * 端末の Push 購読を保存（RLS が本人=自分の membership を担保）。
 * 再購読・鍵ローテーションに備え、同一 endpoint は一旦削除してから挿入する。
 */
export async function savePushSubscription(
  churchId: string,
  sub: PushSubscriptionInput,
): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    church_id: churchId,
    membership_id: membershipId,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    user_agent: sub.userAgent ?? null,
  });
  if (error) return { ok: false, error: error.message };
  // 30秒ルーターキャッシュ(staleTimes)を無効化し、再訪時に最新状態を取得させる
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  // 30秒ルーターキャッシュ(staleTimes)を無効化し、再訪時に最新状態を取得させる
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- 教会設定（Pastor Assist トグルなど。owner/pastor 限定=RLS）---------- */
export async function updateChurchSettings(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  pastorAssistEnabled?: boolean;
  allowPrayerAi?: boolean;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const patch: Record<string, boolean> = {};
  if (input.pastorAssistEnabled !== undefined) patch.pastor_assist_enabled = input.pastorAssistEnabled;
  if (input.allowPrayerAi !== undefined) patch.allow_prayer_ai = input.allowPrayerAi;
  if (Object.keys(patch).length === 0) return { ok: true };
  // RLS(churches_update) が owner/pastor に限定。非権限者は 0 行更新（エラーにならない）。
  const { data, error } = await supabase
    .from("churches")
    .update(patch)
    .eq("id", input.churchId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not permitted" };
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/settings`);
  return { ok: true };
}

/* ---------- デボーション削除（配信済み・アーカイブの整理用）---------- */
export async function deleteDevotion(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  // RLS(content_delete)=作者本人 or 教会管理者。type/church を明示して誤削除を防ぐ。
  // reactions / completion_logs / moderation_reviews は FK cascade で一緒に消える。
  const { data, error } = await supabase
    .from("content_items")
    .delete()
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .eq("type", "devotion")
    .select("id, status, devotion_date");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not found or not permitted" };

  // 監査: 削除は不可逆なので記録する（本文は残さない）。失敗は握り潰さずログへ。
  const { error: auditError } = await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: membershipId,
    action: "devotion.deleted",
    target_type: "content_item",
    target_id: input.contentId,
    metadata: { status: data[0].status, devotion_date: data[0].devotion_date },
  });
  if (auditError) {
    console.error(`[devotions] audit log insert failed for delete: ${auditError.message}`);
  }

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/devotions`);
  return { ok: true };
}

/* ---------- パスワードリセット（Phase2 Beta磨き）---------- */
/**
 * リセットメール送信。アカウントの有無を漏らさないため常に ok を返す。
 * 送信は Supabase の内蔵メール（レート制限あり）。本格運用時は SMTP(Resend) 推奨。
 */
export async function requestPasswordReset(email: string, locale: Locale): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3070";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/${locale}/reset-password`,
  });
  return { ok: true };
}

/** リカバリーリンク経由のセッションで新しいパスワードを設定する。 */
export async function updatePassword(newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 8) return { ok: false, error: "password too short" };
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ---------- 表示名の変更（本人のみ・RPC）---------- */
export async function updateMyDisplayName(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  displayName: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("update_my_display_name", {
    p_church: input.churchId,
    p_display_name: input.displayName,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/me`);
  return { ok: true };
}

/* ---------- 受信箱の既読化（本人のみ・RLS準拠）---------- */
/** 1件を既読にする。RLS(notifications_update=本人=recipient)が他人の通知を弾く。 */
export async function markNotificationRead(input: {
  churchSlug: string;
  locale: Locale;
  notificationId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", input.notificationId)
    .eq("read", false);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/inbox`);
  return { ok: true };
}

/** 自分の未読をすべて既読にする。 */
export async function markAllNotificationsRead(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_membership_id", membershipId)
    .eq("read", false);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/inbox`);
  return { ok: true };
}

/* ═════════════ グループ管理（管理者・RLS groups_write/group_memberships_write）═════════════ */

/** グループが自教会のものであることをサーバー側で確認して返す（越境防止）。 */
async function assertGroupInChurch(
  supabase: SupabaseClient,
  groupId: string,
  churchId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await supabase
    .from("groups")
    .select("id, church_id")
    .eq("id", groupId)
    .eq("church_id", churchId)
    .maybeSingle();
  if (!data) return { ok: false, error: "group not found" };
  return { ok: true };
}

export async function createGroup(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  /** 主言語での名前・説明（教会の contentLanguages[0] キーで保存） */
  primaryLang: string;
  name: string;
  description?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name || name.length > 80) return { ok: false, error: "invalid name" };
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  const { data, error } = await supabase
    .from("groups")
    .insert({
      church_id: input.churchId,
      name: { [input.primaryLang]: name },
      description: input.description?.trim() ? { [input.primaryLang]: input.description.trim() } : null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: membershipId,
    action: "group.created",
    target_type: "group",
    target_id: data.id,
    metadata: {},
  });
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/groups`);
  return { ok: true, data };
}

export async function addGroupMember(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  groupId: string;
  membershipId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const guard = await assertGroupInChurch(supabase, input.groupId, input.churchId);
  if (!guard.ok) return guard;
  const { error } = await supabase
    .from("group_memberships")
    .upsert(
      { group_id: input.groupId, membership_id: input.membershipId, role: "member" },
      { onConflict: "group_id,membership_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/groups`);
  return { ok: true };
}

export async function removeGroupMember(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  groupId: string;
  membershipId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const guard = await assertGroupInChurch(supabase, input.groupId, input.churchId);
  if (!guard.ok) return guard;
  const { error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", input.groupId)
    .eq("membership_id", input.membershipId);
  if (error) return { ok: false, error: error.message };
  // 外したメンバーがリーダーだったらリーダーも解除する
  await supabase
    .from("groups")
    .update({ leader_membership_id: null })
    .eq("id", input.groupId)
    .eq("leader_membership_id", input.membershipId);
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/groups`);
  return { ok: true };
}

/** リーダー設定（null で解除）。リーダーは自動的にグループメンバーにする。 */
export async function setGroupLeader(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  groupId: string;
  membershipId: string | null;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const guard = await assertGroupInChurch(supabase, input.groupId, input.churchId);
  if (!guard.ok) return guard;

  if (input.membershipId) {
    const { error: upErr } = await supabase
      .from("group_memberships")
      .upsert(
        { group_id: input.groupId, membership_id: input.membershipId, role: "leader" },
        { onConflict: "group_id,membership_id" },
      );
    if (upErr) return { ok: false, error: upErr.message };
  }
  // 前リーダーの group 内 role を member に戻す
  await supabase
    .from("group_memberships")
    .update({ role: "member" })
    .eq("group_id", input.groupId)
    .neq("membership_id", input.membershipId ?? "00000000-0000-0000-0000-000000000000");
  const { error } = await supabase
    .from("groups")
    .update({ leader_membership_id: input.membershipId })
    .eq("id", input.groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/groups`);
  return { ok: true };
}

export async function setGroupArchived(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  groupId: string;
  archived: boolean;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const guard = await assertGroupInChurch(supabase, input.groupId, input.churchId);
  if (!guard.ok) return guard;
  const { error } = await supabase
    .from("groups")
    .update({ status: input.archived ? "archived" : "active" })
    .eq("id", input.groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/groups`);
  return { ok: true };
}

/* ═════════════ メンバーの役割編集（owner/pastor のみ・最後のオーナー保護）═════════════ */

const ASSIGNABLE_ROLES = [
  "owner", "pastor", "elder", "staff", "prayer_team", "group_leader", "member", "guest",
] as const;

export async function updateMemberRoles(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  membershipId: string;
  roles: string[];
}): Promise<ActionResult> {
  // 入力検証: 許可リスト外のロールは拒否。空なら member にフォールバック。
  const roles = [...new Set(input.roles.filter((r) => (ASSIGNABLE_ROLES as readonly string[]).includes(r)))];
  if (roles.length === 0) roles.push("member");

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not signed in" };

  // 実行者が owner/pastor であることをサーバー側で確認（RLSも0010で同基準）
  const { data: meRow } = await supabase
    .from("memberships")
    .select("id, membership_roles(role)")
    .eq("church_id", input.churchId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const myRoles: string[] = (meRow?.membership_roles ?? []).map((r: { role: string }) => r.role);
  if (!meRow || !canManageMembers(myRoles)) {
    return { ok: false, error: "owner/pastor role required" };
  }

  // 対象が自教会の会員であることを確認（越境防止）
  const { data: target } = await supabase
    .from("memberships")
    .select("id, membership_roles(role)")
    .eq("id", input.membershipId)
    .eq("church_id", input.churchId)
    .maybeSingle();
  if (!target) return { ok: false, error: "member not found" };
  const before: string[] = (target.membership_roles ?? []).map((r: { role: string }) => r.role);

  // 最後のオーナー保護: owner を外す変更のとき、他に active な owner がいなければ拒否
  if (before.includes("owner") && !roles.includes("owner")) {
    const { count } = await supabase
      .from("membership_roles")
      .select("membership_id, memberships!inner(church_id, status)", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("memberships.church_id", input.churchId)
      .eq("memberships.status", "active")
      .neq("membership_id", input.membershipId);
    if (!count || count === 0) {
      return { ok: false, error: "last owner" };
    }
  }

  // 置換: 消えるロールを削除し、増えるロールを追加（既存はそのまま）
  const toRemove = before.filter((r) => !roles.includes(r));
  const toAdd = roles.filter((r) => !before.includes(r));
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("membership_roles")
      .delete()
      .eq("membership_id", input.membershipId)
      .in("role", toRemove);
    if (error) return { ok: false, error: error.message };
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("membership_roles")
      .insert(toAdd.map((role) => ({ membership_id: input.membershipId, role })));
    if (error) return { ok: false, error: error.message };
  }

  // 監査: 役割変更は必ず記録（04 監査対象）
  await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: meRow.id,
    action: "roles.updated",
    target_type: "membership",
    target_id: input.membershipId,
    metadata: { before, after: roles },
  });

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/members`);
  return { ok: true };
}

export async function setMemberStatus(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  membershipId: string;
  status: "active" | "inactive";
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const me = await myMembership(supabase, input.churchId);
  if (!me) return { ok: false, error: "not a member" };
  if (!canManageMembers(me.roles)) return { ok: false, error: "owner/pastor role required" };

  const { data: target } = await supabase
    .from("memberships")
    .select("id, display_name, status, membership_roles(role)")
    .eq("id", input.membershipId)
    .eq("church_id", input.churchId)
    .maybeSingle();
  if (!target) return { ok: false, error: "member not found" };

  const currentStatus = target.status as "invited" | "active" | "inactive" | "removed";
  if (currentStatus === input.status) return { ok: true };
  if (currentStatus === "removed") return { ok: false, error: "member removed" };
  if (input.status === "inactive" && currentStatus !== "active") {
    return { ok: false, error: "member not active" };
  }
  if (input.status === "active" && currentStatus !== "inactive") {
    return { ok: false, error: "member not inactive" };
  }
  if (input.status === "inactive" && target.id === me.id) {
    return { ok: false, error: "cannot suspend self" };
  }

  const targetRoles: string[] = (target.membership_roles ?? []).map((r: { role: string }) => r.role);
  if (input.status === "inactive" && targetRoles.includes("owner")) {
    const { count } = await supabase
      .from("membership_roles")
      .select("membership_id, memberships!inner(church_id, status)", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("memberships.church_id", input.churchId)
      .eq("memberships.status", "active")
      .neq("membership_id", input.membershipId);
    if (!count || count === 0) {
      return { ok: false, error: "last owner" };
    }
  }

  const { data, error } = await supabase
    .from("memberships")
    .update({ status: input.status })
    .eq("id", input.membershipId)
    .eq("church_id", input.churchId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not permitted" };

  await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: me.id,
    action: input.status === "inactive" ? "member.suspended" : "member.restored",
    target_type: "membership",
    target_id: input.membershipId,
    metadata: { before: currentStatus, after: input.status },
  });

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/members`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMemberFromChurch(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  membershipId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("remove_member_from_church", {
    p_church_id: input.churchId,
    p_membership_id: input.membershipId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/members`);
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/groups`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function leaveChurch(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("leave_church", {
    p_church_id: input.churchId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${input.locale}`);
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/me`);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ═════════════ 役割の呼び方カスタマイズ（owner/pastor のみ・方針A）═════════════ */

const LABELABLE_ROLES = [
  "owner", "pastor", "elder", "staff", "prayer_team", "group_leader", "member", "guest",
] as const;

/**
 * churches.role_labels を更新する。権限は変えず表示名のみ。
 * 入力は { role: { lang: label } }。空文字は「標準に戻す」として除去する。
 */
export async function updateRoleLabels(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  labels: Record<string, Record<string, string>>;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not signed in" };

  // 実行者が owner/pastor であることを確認（RLS churches_update と同じ層）
  const { data: meRow } = await supabase
    .from("memberships")
    .select("id, membership_roles(role)")
    .eq("church_id", input.churchId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const myRoles: string[] = (meRow?.membership_roles ?? []).map((r: { role: string }) => r.role);
  if (!meRow || !canManageMembers(myRoles)) {
    return { ok: false, error: "owner/pastor role required" };
  }

  // サニタイズ: 既知ロールのみ・言語コードは英数2-8字・ラベルは1〜20字。空は除去。
  const clean: Record<string, Record<string, string>> = {};
  for (const [role, byLang] of Object.entries(input.labels ?? {})) {
    if (!(LABELABLE_ROLES as readonly string[]).includes(role)) continue;
    if (!byLang || typeof byLang !== "object") continue;
    const entry: Record<string, string> = {};
    for (const [lang, raw] of Object.entries(byLang)) {
      if (!/^[a-z]{2,8}$/i.test(lang)) continue;
      const v = String(raw ?? "").trim();
      if (!v) continue;
      if (v.length > 20) return { ok: false, error: "label too long" };
      entry[lang] = v;
    }
    if (Object.keys(entry).length > 0) clean[role] = entry;
  }

  const { error } = await supabase
    .from("churches")
    .update({ role_labels: clean })
    .eq("id", input.churchId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: meRow.id,
    action: "church.role_labels_updated",
    target_type: "church",
    target_id: input.churchId,
    metadata: { labels: clean },
  });

  // 呼び方は全画面に影響するためルーターキャッシュごと無効化
  revalidatePath("/", "layout");
  return { ok: true };
}
