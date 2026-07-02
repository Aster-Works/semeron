"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/app/lib/supabase/server";
import type { Locale, ReactionType, Visibility } from "@/app/lib/demo/types";

export type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

async function myMembershipId(supabase: SupabaseClient, churchId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("church_id", churchId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return data?.id ?? null;
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
export async function signUpWithPassword(email: string, password: string): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  // メール確認が必須の環境ではセッションが張られない。その場合は明示的に失敗を返す。
  if (!data.session) return { ok: false, error: "confirmation required" };
  return { ok: true };
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
    return { ok: true, data: { active: false } };
  }
  const { error } = await supabase
    .from("reactions")
    .insert({ church_id: churchId, content_item_id: contentId, membership_id: membershipId, type });
  if (error) return { ok: false, error: error.message };
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
  expiresAt?: string | null;
}): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };
  const { error } = await supabase.from("content_items").insert({
    church_id: input.churchId,
    author_membership_id: membershipId,
    type: "prayer_request",
    status: "pending_review",
    visibility: input.visibility,
    requested_visibility: input.visibility,
    title: { [input.locale]: input.title },
    body: { [input.locale]: input.body },
    anonymous: input.anonymous,
    includes_third_party: input.includesThirdParty,
    expires_at: input.expiresAt || null,
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
  const membershipId = await myMembershipId(supabase, input.churchId);
  if (!membershipId) return { ok: false, error: "not a member" };

  const row = {
    church_id: input.churchId,
    author_membership_id: membershipId,
    type: "devotion" as const,
    status: input.status,
    visibility: input.visibility,
    devotion_date: input.devotionDate || null,
    scheduled_at: input.scheduledAt || null,
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
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
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
