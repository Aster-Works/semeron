"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canManageMembers,
  expiryDateToIso,
  getChurchTiming,
  isChurchAdminRole,
  myMembership,
  myMembershipId,
  normalizeDateKey,
  scheduleDateToIso,
  type ActionResult,
} from "@/app/lib/db/action-helpers";
import {
  DELETED_ACCOUNT_DISPLAY_NAME,
  getAccountMembershipRoles,
  requiresAnotherActiveOwner,
  type AccountDeletionMembershipRow,
} from "@/app/lib/db/accountDeletion";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createServerSupabase } from "@/app/lib/supabase/server";
import type { Locale, ReactionType, RetentionPolicy, SoftGateMode, Visibility } from "@/app/lib/demo/types";
import { CONTENT_LANGUAGES } from "@/app/lib/i18n/languages";

const CONTENT_LANGUAGE_CODES = new Set(CONTENT_LANGUAGES.map((l) => l.code));
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_TTL_DAYS = 30;
const SOFT_GATE_MODES = new Set(["gentle", "focused", "off"]);
const ADMIN_REVIEW_ROLES = ["owner", "pastor", "elder", "staff"];

const RETENTION_RULES: Record<
  keyof RetentionPolicy,
  { fallback: number; min: number; max: number }
> = {
  reflectionVisibleDays: { fallback: 30, min: 7, max: 3650 },
  notificationReadDays: { fallback: 30, min: 7, max: 3650 },
  notificationUnreadDays: { fallback: 90, min: 14, max: 3650 },
  adminNotificationDays: { fallback: 180, min: 30, max: 3650 },
  reactionIdentityDays: { fallback: 90, min: 7, max: 3650 },
  auditLogDays: { fallback: 730, min: 180, max: 3650 },
};

function generateInviteCode(length = 10): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => INVITE_CODE_ALPHABET[b % INVITE_CODE_ALPHABET.length]).join("");
}

function inviteExpiryIso(): string {
  return new Date(Date.now() + INVITE_CODE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeMorningNotificationTime(value: string): string | null {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}:00`;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function localizedStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function jsonObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeRetentionPolicy(value: Partial<RetentionPolicy>): RetentionPolicy | null {
  const entries = Object.entries(RETENTION_RULES) as [
    keyof RetentionPolicy,
    { fallback: number; min: number; max: number },
  ][];
  const next = {} as RetentionPolicy;
  for (const [key, rule] of entries) {
    const raw = value[key];
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return null;
    next[key] = Math.max(rule.min, Math.min(rule.max, Math.trunc(n)));
  }
  return next;
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
    anonymous: true,
    title: {},
    body: { [locale]: body },
    published_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/church/${churchSlug}/today`);
  return { ok: true };
}

/**
 * 自分の応答（reflection）を後から編集する。
 * RLS(content_update)は type='reflection' の作者更新を許すため、公開状態のまま更新できる
 * （応答は非モデレーションの carve-out）。所有権はサーバー側でも二重確認する。
 */
export async function updateReflection(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentId: string;
  body: string;
}): Promise<ActionResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "empty" };
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  // 作者列は authenticated から列レベルで剥奪済み → 本人判定は owns_content(definer) で行う。
  const { data: owns } = await supabase.rpc("owns_content", { content_id: input.contentId });
  if (!owns) return { ok: false, error: "not found or not permitted" };

  // 現行本文を取得し、多言語 jsonb の当該ロケールだけ差し替える（他言語を消さない）。
  const { data: cur } = await supabase
    .from("content_items")
    .select("body")
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .eq("type", "reflection")
    .maybeSingle();
  if (!cur) return { ok: false, error: "not found or not permitted" };
  const nextBody = { ...(cur.body as Record<string, string> | null), [input.locale]: body };

  // RLS(content_update)=作者本人(type=reflection)を担保。owns_content で二重に確認済み。
  const { data, error } = await supabase
    .from("content_items")
    .update({ body: nextBody })
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .eq("type", "reflection")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not found or not permitted" };

  revalidatePath(`/${input.locale}/church/${input.churchSlug}/today`);
  revalidatePath("/", "layout");
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
  pastorConsult: boolean;
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
  // 匿名は単一の真実(anonymous)に集約する。公開範囲カードで anonymous_church を
  // 選んだ場合もトグル同様に匿名扱いとし、後段のモデレーションで公開範囲が
  // 変わっても匿名が剥がれないようにする（DBトリガでも同不変条件を保証）。
  const anonymous = input.anonymous || input.visibility === "anonymous_church";
  const contentId = randomUUID();
  const { error } = await supabase.from("content_items").insert({
    id: contentId,
    church_id: input.churchId,
    group_id: groupId,
    author_membership_id: membershipId,
    type: "prayer_request",
    status: "pending_review",
    visibility: input.visibility,
    requested_visibility: input.visibility,
    title: { [input.locale]: input.title },
    body: { [input.locale]: input.body },
    anonymous,
    includes_third_party: input.includesThirdParty,
    expires_at: expiresAt,
    prayer_outcome: "open",
    metadata: input.pastorConsult ? { pastor_consult_requested: true } : {},
  });
  if (error) return { ok: false, error: error.message };
  if (input.pastorConsult) {
    await notifyPastorConsultRequested({
      churchId: input.churchId,
      churchSlug: input.churchSlug,
      locale: input.locale,
      contentId,
    });
  }
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/prayers`);
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/prayer-requests`);
  revalidatePath("/", "layout");
  return { ok: true };
}

async function notifyPastorConsultRequested(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: recipients, error } = await admin
      .from("memberships")
      .select("id, membership_roles!inner(role)")
      .eq("church_id", input.churchId)
      .eq("status", "active")
      .in("membership_roles.role", ["owner", "pastor"]);

    if (error) {
      console.error(`[prayer] pastor consult recipient lookup failed: ${error.message}`);
      return;
    }

    type RecipientRow = { id: string; membership_roles?: { role: string }[] | null };
    const recipientIds = [
      ...new Set(((recipients ?? []) as RecipientRow[]).map((r) => r.id).filter(Boolean)),
    ];
    if (recipientIds.length === 0) return;

    const targetPath = `/${input.locale}/admin/${input.churchSlug}/prayer-requests`;
    const { error: insertError } = await admin.from("notifications").insert(
      recipientIds.map((recipientId) => ({
        church_id: input.churchId,
        recipient_membership_id: recipientId,
        type: "prayer_request_submitted_to_moderators",
        category: "prayer",
        channel: "in_app",
        title: {
          ja: "個別相談の希望があります",
          en: "Pastoral follow-up requested",
        },
        body: {
          ja: "祈祷課題の確認画面で内容を確認してください。",
          en: "Review the request in the moderation queue.",
        },
        data: {
          content_item_id: input.contentId,
          target_path: targetPath,
          pastor_consult_requested: true,
        },
      })),
    );
    if (insertError) {
      console.error(`[prayer] pastor consult notification insert failed: ${insertError.message}`);
    }
  } catch (err) {
    console.error(
      `[prayer] pastor consult notification failed: ${
        err instanceof Error ? err.message : "unknown error"
      }`,
    );
  }
}

/**
 * 自分の祈祷課題を編集する。承認制を守るため:
 *  - 公開済み(published)を編集したら再審査（pending_review）へ戻す。
 *  - 匿名は sticky（true へのみ・DBトリガでも保証）。編集で匿名を外せない。
 * 本文/タイトルは当該ロケールのみ差し替え、匿名は「入れる」方向のみ反映する。
 */
export async function updatePrayerRequest(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentId: string;
  title: string;
  body: string;
  anonymous: boolean;
}): Promise<ActionResult> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { ok: false, error: "empty" };
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  // 本人判定は owns_content(definer)。作者列は authenticated から剥奪済みのため直接引かない。
  const { data: owns } = await supabase.rpc("owns_content", { content_id: input.contentId });
  if (!owns) return { ok: false, error: "not found or not permitted" };

  const { data: cur } = await supabase
    .from("content_items")
    .select("status, visibility, requested_visibility, anonymous, title, body")
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .eq("type", "prayer_request")
    .maybeSingle();
  if (!cur) return { ok: false, error: "not found or not permitted" };

  const reReview = cur.status === "published";
  const nextStatus = reReview ? "pending_review" : cur.status;
  // 匿名は入れる方向のみ（sticky）。既に匿名ならそのまま。
  const nextAnonymous =
    cur.anonymous ||
    input.anonymous ||
    cur.visibility === "anonymous_church" ||
    cur.requested_visibility === "anonymous_church";
  const nextTitle = { ...(cur.title as Record<string, string> | null), [input.locale]: title };
  const nextBody = { ...(cur.body as Record<string, string> | null), [input.locale]: body };

  const { data, error } = await supabase
    .from("content_items")
    .update({
      title: nextTitle,
      body: nextBody,
      anonymous: nextAnonymous,
      status: nextStatus,
      // 再審査に戻す場合は公開日時をクリアし、承認で再付与させる。
      published_at: reReview ? null : undefined,
    })
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .eq("type", "prayer_request")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not found or not permitted" };

  revalidatePath(`/${input.locale}/church/${input.churchSlug}/prayers`);
  revalidatePath("/", "layout");
  return { ok: true, data: { reReview } };
}

/** 自分の祈祷課題を取り下げる（削除）。RLS(content_delete)=作者本人 or 管理者。 */
export async function withdrawPrayerRequest(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  // 本人判定は owns_content(definer)。RLS(content_delete)=作者本人 or 管理者。
  const { data: owns } = await supabase.rpc("owns_content", { content_id: input.contentId });
  if (!owns) return { ok: false, error: "not found or not permitted" };

  const { data, error } = await supabase
    .from("content_items")
    .delete()
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .eq("type", "prayer_request")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not found or not permitted" };

  revalidatePath(`/${input.locale}/church/${input.churchSlug}/prayers`);
  revalidatePath("/", "layout");
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
  const scheduledAtIso =
    input.status === "scheduled"
      ? scheduleDateToIso(scheduledDate, timing.timezone, timing.morningTime)
      : null;
  if (input.status === "scheduled") {
    const scheduledAtMs = scheduledAtIso ? Date.parse(scheduledAtIso) : Number.NaN;
    if (!Number.isFinite(scheduledAtMs) || scheduledAtMs <= Date.now()) {
      return { ok: false, error: "schedule date must be in the future" };
    }
  }

  const row = {
    group_id: null,
    status: input.status,
    visibility: input.visibility,
    devotion_date: devotionDate,
    scheduled_at: scheduledAtIso,
    published_at: input.status === "published" ? new Date().toISOString() : null,
    scripture_reference: input.scriptureReference || null,
    scripture_translation: input.scriptureTranslation || null,
    scripture_quote: input.scriptureQuote ?? {},
    title: input.title,
    body: input.body,
    reflection_question: input.reflectionQuestion ?? {},
    prayer_guide: input.prayerGuide ?? {},
  };

  if (input.id) {
    const { data: existing, error: existingError } = await supabase
      .from("content_items")
      .select("id")
      .eq("id", input.id)
      .eq("church_id", input.churchId)
      .eq("type", "devotion")
      .maybeSingle();
    if (existingError) return { ok: false, error: existingError.message };
    if (!existing) return { ok: false, error: "not found or not permitted" };

    const { data, error } = await supabase
      .from("content_items")
      .update(row)
      .eq("id", input.id)
      .eq("church_id", input.churchId)
      .eq("type", "devotion")
      .select("id");
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) return { ok: false, error: "not found or not permitted" };
  } else {
    const { error } = await supabase.from("content_items").insert({
      ...row,
      church_id: input.churchId,
      author_membership_id: membership.id,
      type: "devotion",
    });
    if (error) return { ok: false, error: error.message };
  }

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
  churchName?: string;
  churchNameLocale?: string;
  timezone?: string;
  morningNotificationTime?: string;
  softGateMode?: SoftGateMode;
  pastorAssistEnabled?: boolean;
  allowPrayerAi?: boolean;
  retentionPolicy?: Partial<RetentionPolicy>;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const me = await myMembership(supabase, input.churchId);
  if (!me) return { ok: false, error: "not a member" };
  if (!canManageMembers(me.roles)) return { ok: false, error: "owner/pastor role required" };

  const { data: current, error: currentError } = await supabase
    .from("churches")
    .select("id, name, timezone, morning_notification_time, soft_gate_mode, pastor_assist_enabled, allow_prayer_ai, retention_policy")
    .eq("id", input.churchId)
    .maybeSingle();
  if (currentError) return { ok: false, error: currentError.message };
  if (!current) return { ok: false, error: "church not found" };

  const patch: {
    name?: Record<string, string>;
    timezone?: string;
    morning_notification_time?: string;
    soft_gate_mode?: SoftGateMode;
    pastor_assist_enabled?: boolean;
    allow_prayer_ai?: boolean;
    retention_policy?: RetentionPolicy;
  } = {};

  if (input.churchName !== undefined) {
    const name = input.churchName.trim();
    if (!name || name.length > 120) return { ok: false, error: "invalid church name" };
    const nameLocale = (input.churchNameLocale ?? input.locale).trim().toLowerCase();
    if (!/^[a-z]{2,8}$/i.test(nameLocale)) return { ok: false, error: "invalid church name locale" };
    patch.name = { ...localizedStringRecord(current.name), [nameLocale]: name };
  }
  if (input.timezone !== undefined) {
    const timezone = input.timezone.trim();
    if (!timezone || timezone.length > 64 || !isValidTimeZone(timezone)) {
      return { ok: false, error: "invalid timezone" };
    }
    patch.timezone = timezone;
  }
  if (input.morningNotificationTime !== undefined) {
    const time = normalizeMorningNotificationTime(input.morningNotificationTime);
    if (!time) return { ok: false, error: "invalid morning notification time" };
    patch.morning_notification_time = time;
  }
  if (input.softGateMode !== undefined) {
    if (!SOFT_GATE_MODES.has(input.softGateMode)) return { ok: false, error: "invalid soft gate mode" };
    patch.soft_gate_mode = input.softGateMode;
  }
  if (input.pastorAssistEnabled !== undefined) patch.pastor_assist_enabled = input.pastorAssistEnabled;
  if (input.allowPrayerAi !== undefined) patch.allow_prayer_ai = input.allowPrayerAi;
  if (input.retentionPolicy !== undefined) {
    const policy = normalizeRetentionPolicy(input.retentionPolicy);
    if (!policy) return { ok: false, error: "invalid retention policy" };
    patch.retention_policy = policy;
  }
  if (Object.keys(patch).length === 0) return { ok: true };
  const { data, error } = await supabase
    .from("churches")
    .update(patch)
    .eq("id", input.churchId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not permitted" };

  await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: me.id,
    action: "church.settings_updated",
    target_type: "church",
    target_id: input.churchId,
    metadata: { changed: Object.keys(patch), patch },
  });

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/settings`);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 現在の招待コードを即時失効させる（owner/pastor 限定）。 */
export async function expireInviteCode(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const me = await myMembership(supabase, input.churchId);
  if (!me) return { ok: false, error: "not a member" };
  if (!canManageMembers(me.roles)) return { ok: false, error: "owner/pastor role required" };

  const expiredAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("churches")
    .update({ invite_code_expires_at: expiredAt })
    .eq("id", input.churchId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "not permitted" };

  await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: me.id,
    action: "invite.expired",
    target_type: "church",
    target_id: input.churchId,
    metadata: { expired_at: expiredAt },
  });

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/settings`);
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/members`);
  return { ok: true };
}

/** 新しい30日招待コードを発行する（owner/pastor 限定）。 */
export async function rotateInviteCode(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const me = await myMembership(supabase, input.churchId);
  if (!me) return { ok: false, error: "not a member" };
  if (!canManageMembers(me.roles)) return { ok: false, error: "owner/pastor role required" };

  const rotatedAt = new Date().toISOString();
  const expiresAt = inviteExpiryIso();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from("churches")
      .update({
        invite_code: code,
        invite_code_expires_at: expiresAt,
        invite_code_rotated_at: rotatedAt,
      })
      .eq("id", input.churchId)
      .select("id, invite_code, invite_code_expires_at, invite_code_rotated_at")
      .maybeSingle();

    if (error?.code === "23505") continue;
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "not permitted" };

    await supabase.from("audit_logs").insert({
      church_id: input.churchId,
      actor_membership_id: me.id,
      action: "invite.rotated",
      target_type: "church",
      target_id: input.churchId,
      metadata: {
        expires_at: expiresAt,
        rotated_at: rotatedAt,
      },
    });

    revalidatePath(`/${input.locale}/admin/${input.churchSlug}/settings`);
    revalidatePath(`/${input.locale}/admin/${input.churchSlug}/members`);
    return { ok: true, data };
  }

  return { ok: false, error: "could not generate invite code" };
}

/* ---------- 配信言語（owner/pastor 限定=RLS）---------- */
export async function updateContentLanguages(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentLanguages: string[];
}): Promise<ActionResult> {
  const langs = [...new Set(input.contentLanguages.map((l) => l.trim().toLowerCase()))]
    .filter((l) => CONTENT_LANGUAGE_CODES.has(l));
  if (langs.length === 0) return { ok: false, error: "language required" };
  if (langs.length > CONTENT_LANGUAGES.length) return { ok: false, error: "too many languages" };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("churches")
    .update({ content_languages: langs })
    .eq("id", input.churchId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not permitted" };

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/settings`);
  revalidatePath("/", "layout");
  return { ok: true, data: { contentLanguages: langs } };
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
    .is("archived_at", null)
    .eq("muted_by_recipient", false)
    .eq("read", false);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/inbox`);
  return { ok: true };
}

/** 自分宛ての通知を通知センターから隠す。 */
export async function muteNotification(input: {
  churchSlug: string;
  locale: Locale;
  notificationId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .update({
      read: true,
      muted_by_recipient: true,
      archived_at: new Date().toISOString(),
    })
    .eq("id", input.notificationId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "not found or not permitted" };
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/inbox`);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 会員が投稿について管理者レビューを依頼する。 */
export async function requestAdminReview(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const me = await myMembership(supabase, input.churchId);
  if (!me) return { ok: false, error: "not a member" };

  const { data: visibleContent } = await supabase
    .from("content_feed")
    .select("id, type, status")
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .maybeSingle();
  if (!visibleContent) return { ok: false, error: "not found or not permitted" };
  if (visibleContent.status === "archived" || visibleContent.status === "rejected") {
    return { ok: false, error: "content is not reviewable" };
  }

  const admin = createAdminClient();
  const requestedAt = new Date().toISOString();
  const { data: current, error: currentError } = await admin
    .from("content_items")
    .select("id, metadata")
    .eq("id", input.contentId)
    .eq("church_id", input.churchId)
    .maybeSingle();
  if (currentError) return { ok: false, error: currentError.message };
  if (!current) return { ok: false, error: "content not found" };

  const metadata = jsonObjectRecord(current.metadata);
  const history = Array.isArray(metadata.admin_review_requests)
    ? metadata.admin_review_requests.slice(-9)
    : [];
  const nextMetadata = {
    ...metadata,
    admin_review_requested: true,
    admin_review_requested_at: requestedAt,
    admin_review_requested_by: me.id,
    admin_review_request_count: Number(metadata.admin_review_request_count ?? 0) + 1,
    admin_review_requests: [...history, { at: requestedAt, by: me.id }],
  };

  const { error: updateError } = await admin
    .from("content_items")
    .update({ metadata: nextMetadata })
    .eq("id", input.contentId)
    .eq("church_id", input.churchId);
  if (updateError) return { ok: false, error: updateError.message };

  const { data: recipients, error: recipientError } = await admin
    .from("memberships")
    .select("id, membership_roles!inner(role)")
    .eq("church_id", input.churchId)
    .eq("status", "active")
    .in("membership_roles.role", ADMIN_REVIEW_ROLES);
  if (recipientError) return { ok: false, error: recipientError.message };

  type RecipientRow = { id: string; membership_roles?: { role: string }[] | null };
  const recipientIds = [
    ...new Set(((recipients ?? []) as RecipientRow[]).map((r) => r.id).filter(Boolean)),
  ];
  const targetPath = `/${input.locale}/admin/${input.churchSlug}/prayer-requests`;
  if (recipientIds.length > 0) {
    const { error: insertError } = await admin.from("notifications").insert(
      recipientIds.map((recipientId) => ({
        church_id: input.churchId,
        recipient_membership_id: recipientId,
        type: "admin_review_requested",
        category: "admin",
        channel: "in_app",
        title: {
          ja: "投稿の確認依頼があります",
          en: "A post needs admin review",
        },
        body: {
          ja: "会員から投稿の確認依頼が届きました。管理画面で確認してください。",
          en: "A member requested review for a post. Please check the admin screen.",
        },
        data: {
          content_item_id: input.contentId,
          requested_by: me.id,
          target_path: targetPath,
        },
      })),
    );
    if (insertError) return { ok: false, error: insertError.message };
  }

  await admin.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: me.id,
    action: "content.review_requested",
    target_type: "content_item",
    target_id: input.contentId,
    metadata: { content_type: visibleContent.type },
  });

  revalidatePath(`/${input.locale}/church/${input.churchSlug}/prayers`);
  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/notifications`);
  return { ok: true };
}

/** owner/pastor が保持期間クリーンアップを手動実行する。 */
export async function runRetentionCleanupNow(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const me = await myMembership(supabase, input.churchId);
  if (!me) return { ok: false, error: "not a member" };
  if (!canManageMembers(me.roles)) return { ok: false, error: "owner/pastor role required" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("run_retention_cleanup", {
    target_church: input.churchId,
  });
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: me.id,
    action: "retention.cleanup_run",
    target_type: "church",
    target_id: input.churchId,
    metadata: data && typeof data === "object" ? data : {},
  });

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/settings`);
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/inbox`);
  revalidatePath("/", "layout");
  return { ok: true, data };
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

async function assertMembershipInChurch(
  supabase: SupabaseClient,
  membershipId: string,
  churchId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("id", membershipId)
    .eq("church_id", churchId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return { ok: false, error: "member not found" };
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
  const memberGuard = await assertMembershipInChurch(supabase, input.membershipId, input.churchId);
  if (!memberGuard.ok) return memberGuard;
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
    const memberGuard = await assertMembershipInChurch(supabase, input.membershipId, input.churchId);
    if (!memberGuard.ok) return memberGuard;
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

export async function deleteGroup(input: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  groupId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const me = await myMembership(supabase, input.churchId);
  if (!me) return { ok: false, error: "not a member" };
  if (!isChurchAdminRole(me.roles)) return { ok: false, error: "admin role required" };

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, status")
    .eq("id", input.groupId)
    .eq("church_id", input.churchId)
    .maybeSingle();
  if (groupError) return { ok: false, error: groupError.message };
  if (!group) return { ok: false, error: "group not found" };

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", input.groupId)
    .eq("church_id", input.churchId);
  if (error) {
    if (error.code === "23503" || error.message.includes("group has content items")) {
      return { ok: false, error: "group has content" };
    }
    return { ok: false, error: error.message };
  }

  await supabase.from("audit_logs").insert({
    church_id: input.churchId,
    actor_membership_id: me.id,
    action: "group.deleted",
    target_type: "group",
    target_id: input.groupId,
    metadata: { name: group.name, previous_status: group.status },
  });

  revalidatePath(`/${input.locale}/admin/${input.churchSlug}/groups`);
  revalidatePath("/", "layout");
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not signed in" };

  const { error } = await supabase.rpc("leave_church", {
    p_church_id: input.churchId,
  });
  if (error) return { ok: false, error: error.message };

  const { data: nextMembership } = await supabase
    .from("memberships")
    .select("church:churches!inner(slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const church = nextMembership?.church as { slug?: string } | { slug?: string }[] | null | undefined;
  const nextSlug = Array.isArray(church) ? church[0]?.slug : church?.slug;
  const nextPath = nextSlug
    ? `/${input.locale}/church/${nextSlug}/today`
    : `/${input.locale}/onboarding`;

  revalidatePath(`/${input.locale}`);
  revalidatePath(`/${input.locale}/church/${input.churchSlug}/me`);
  revalidatePath("/", "layout");
  return { ok: true, data: { nextPath } };
}

export async function deleteMyAccount(input: {
  locale: Locale;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not signed in" };

  const admin = createAdminClient();
  const { data: memberships, error: membershipsError } = await admin
    .from("memberships")
    .select("id, church_id, status, membership_roles(role)")
    .eq("user_id", user.id);
  if (membershipsError) return { ok: false, error: membershipsError.message };

  const membershipRows = (memberships ?? []) as AccountDeletionMembershipRow[];
  for (const membership of membershipRows) {
    if (requiresAnotherActiveOwner(membership)) {
      const { count, error } = await admin
        .from("membership_roles")
        .select("membership_id, memberships!inner(church_id, status)", { count: "exact", head: true })
        .eq("role", "owner")
        .eq("memberships.church_id", membership.church_id)
        .eq("memberships.status", "active")
        .neq("membership_id", membership.id);
      if (error) return { ok: false, error: error.message };
      if (!count || count === 0) {
        return { ok: false, error: "last owner" };
      }
    }
  }

  const membershipIds = membershipRows.map((m) => m.id);
  if (membershipIds.length > 0) {
    const { error: pushError } = await admin
      .from("push_subscriptions")
      .delete()
      .in("membership_id", membershipIds);
    if (pushError) return { ok: false, error: pushError.message };

    const { error: leaderError } = await admin
      .from("groups")
      .update({ leader_membership_id: null })
      .in("leader_membership_id", membershipIds);
    if (leaderError) return { ok: false, error: leaderError.message };

    const { error: groupMembershipError } = await admin
      .from("group_memberships")
      .delete()
      .in("membership_id", membershipIds);
    if (groupMembershipError) return { ok: false, error: groupMembershipError.message };

    const { error: membershipUpdateError } = await admin
      .from("memberships")
      .update({
        status: "removed",
        display_name: DELETED_ACCOUNT_DISPLAY_NAME,
        email: null,
        user_id: null,
      })
      .in("id", membershipIds)
      .eq("user_id", user.id);
    if (membershipUpdateError) return { ok: false, error: membershipUpdateError.message };

    const { error: auditError } = await admin.from("audit_logs").insert(
      membershipRows.map((membership) => ({
        church_id: membership.church_id,
        actor_membership_id: membership.id,
        action: "account.deleted",
        target_type: "membership",
        target_id: membership.id,
        metadata: {
          before: membership.status,
          after: "removed",
          roles: getAccountMembershipRoles(membership),
        },
      })),
    );
    if (auditError) return { ok: false, error: auditError.message };
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("user_id", user.id);
  if (profileError) return { ok: false, error: profileError.message };

  await supabase.auth.signOut();

  // Soft-delete removes Auth PII while retaining an irreversible hashed identifier in auth schema.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, true);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath(`/${input.locale}`);
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
