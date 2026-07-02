"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale, Visibility, Viewer } from "@/app/lib/demo/types";
import { VISIBILITIES } from "@/app/lib/demo/types";
import { resolveChurchContext } from "@/app/lib/db/context";
import { isChurchAdmin, canModerate } from "@/app/lib/demo/visibility";
import { isAssistConfigured, runAssist, AssistNotConfiguredError } from "./client";
import {
  GLOBAL_SYSTEM_PROMPT,
  devotionDraftPrompt,
  reflectionQuestionsPrompt,
  translationPrompt,
  prayerSensitiveReviewPrompt,
  weeklyPrayerListPrompt,
} from "./prompts";
import { extractJson, asString, asStringArray } from "./parse";
import { redactNames } from "./redact";
import type {
  AssistDevotionKind,
  DevotionAssistResult,
  PrayerSensitiveReview,
  AssistRiskLevel,
  ReflectionQuestionOption,
  WeeklyPrayerList,
  WeeklyPrayerListSection,
} from "./types";

/**
 * Pastor Assist サーバーアクション（07 Phase 5 / 08 AI Prompt Pack）。
 *
 * 不変条件（安全性の核）:
 *  - すべてサーバー側で権限を再確認する（クライアントの UI ゲートは信用しない）。
 *  - デボーション補助 = 管理者(owner/pastor/elder/staff)。祈祷確認 = モデレータ。
 *  - 教会設定 pastor_assist_enabled が必須。祈祷本文を AI に送るには allow_prayer_ai も必須。
 *  - **下書き・提案のみを返す。** content_items を書かない／承認却下しない／自動配信しない。
 *  - 祈祷本文は送信前に会員名をリダクション（既定）。
 *  - 利用は audit_logs に記録（本文・名前は残さず、種別・件数・リスク度のみ）。
 */

export type AssistErrorCode =
  | "not_configured"
  | "not_allowed"
  | "forbidden"
  | "parse_error"
  | "error";

export type AssistActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: AssistErrorCode };

function fail(code: AssistErrorCode, error: string): { ok: false; error: string; code: AssistErrorCode } {
  return { ok: false, error, code };
}

/** 監査記録（本文・名前は残さない。種別/モデル/トークン数/リスク度など最小限のみ）。 */
async function logAssist(
  supabase: SupabaseClient,
  viewer: Viewer,
  action: string,
  targetId: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    church_id: viewer.church.id,
    actor_membership_id: viewer.membership?.id ?? null,
    action,
    target_type: targetId ? "content_item" : "church",
    target_id: targetId,
    metadata,
  });
  // 監査行は AI 利用（＝祈祷本文の外部送信）の唯一の耐久記録。挿入失敗を握り潰さず、
  // 必ずサーバーログに残して事後に検知できるようにする（送信はすでに発生済み）。
  // どの教会・誰・どの対象かを付けて追跡可能にする（本文・名前は載せない）。
  if (error) {
    console.error(
      `[pastor-assist] audit log insert failed action=${action} church=${viewer.church.id} actor=${viewer.membership?.id ?? "?"} target=${targetId ?? "-"}: ${error.message}`,
    );
  }
}

function toVisibility(v: unknown, fallback: Visibility): Visibility {
  return typeof v === "string" && (VISIBILITIES as readonly string[]).includes(v)
    ? (v as Visibility)
    : fallback;
}

function toRisk(v: unknown): AssistRiskLevel {
  return v === "low" || v === "medium" || v === "high" || v === "urgent" ? v : "medium";
}

/* ─────────────────────────────────────────────────────────────────────────
 * デボーション補助（管理者限定）: 箇所から下書き / 黙想の問い / 翻訳
 * ───────────────────────────────────────────────────────────────────────── */
export interface AssistDevotionInput {
  churchSlug: string;
  locale: Locale;
  kind: AssistDevotionKind;
  /** 生成対象のコンテンツ言語（例 'ja'/'en'/'es'）。 */
  contentLang: string;
  /** 編集中の既存デボーション id（監査用・任意）。 */
  contentItemId?: string;
  // draft_from_passage
  scriptureReference?: string;
  scriptureExcerpt?: string;
  seriesTheme?: string;
  pastorNotes?: string;
  // suggest_questions
  centralMessage?: string;
  // translate
  sourceLang?: string;
  targetLang?: string;
  sourceText?: string;
  translateField?: "title" | "body" | "reflectionQuestion" | "prayerGuide";
}

export async function assistDevotionDraft(
  input: AssistDevotionInput,
): Promise<AssistActionResult<DevotionAssistResult>> {
  const ctx = await resolveChurchContext(input.churchSlug);
  if (!ctx) return fail("forbidden", "not a member");
  const { supabase, viewer } = ctx;

  // 権限: デボーション補助は管理者限定（サーバー側で再確認）
  if (!isChurchAdmin(viewer)) return fail("forbidden", "admin role required");
  // 教会設定で有効化されていること
  if (!viewer.church.pastorAssistEnabled) return fail("not_allowed", "pastor assist is not enabled for this church");
  // モデル未設定
  if (!isAssistConfigured()) return fail("not_configured", "AI is not configured");

  try {
    if (input.kind === "suggest_questions") {
      const prompt = reflectionQuestionsPrompt({
        contentLang: input.contentLang,
        scriptureReference: input.scriptureReference,
        centralMessage: input.centralMessage,
      });
      const res = await runAssist({ system: GLOBAL_SYSTEM_PROMPT, user: prompt, maxTokens: 900 });
      const parsed = extractJson<{ questions?: unknown[] }>(res.text);
      if (!parsed) return fail("parse_error", "could not parse AI output");
      const options: ReflectionQuestionOption[] = (parsed.questions ?? [])
        .map((q) => {
          const obj = (q ?? {}) as Record<string, unknown>;
          const question = asString(obj.question).trim();
          const bestForRaw = asString(obj.best_for);
          const bestFor: ReflectionQuestionOption["bestFor"] =
            bestForRaw === "group" || bestForRaw === "prayer" ? bestForRaw : "personal";
          return { question, bestFor };
        })
        .filter((o) => o.question.length > 0)
        .slice(0, 5);
      await logAssist(supabase, viewer, "pastor_assist.reflection_questions", input.contentItemId ?? null, {
        feature: "reflection_questions",
        model: res.model,
        tokens_in: res.usage.inputTokens,
        tokens_out: res.usage.outputTokens,
        options: options.length,
      });
      return { ok: true, data: { kind: input.kind, patch: {}, questionOptions: options, reviewNotes: [] } };
    }

    if (input.kind === "translate") {
      const sourceLang = input.sourceLang ?? viewer.church.contentLanguages[0] ?? "ja";
      const targetLang = input.targetLang ?? input.contentLang;
      const field = input.translateField ?? "body";
      const text = (input.sourceText ?? "").trim();
      if (!text) return fail("error", "nothing to translate");
      const prompt = translationPrompt({
        sourceLang,
        targetLang,
        contentType: `devotion ${field}`,
        text,
      });
      const res = await runAssist({ system: GLOBAL_SYSTEM_PROMPT, user: prompt, maxTokens: 1200 });
      const parsed = extractJson<Record<string, unknown>>(res.text);
      if (!parsed) return fail("parse_error", "could not parse AI output");
      const translated = asString(parsed.translated_text).trim();
      if (!translated) return fail("parse_error", "empty translation");
      const reviewNotes = [...asStringArray(parsed.translator_notes), ...asStringArray(parsed.permission_notes)];
      await logAssist(supabase, viewer, "pastor_assist.translate", input.contentItemId ?? null, {
        feature: "translate",
        field,
        source_lang: sourceLang,
        target_lang: targetLang,
        model: res.model,
        tokens_in: res.usage.inputTokens,
        tokens_out: res.usage.outputTokens,
      });
      return {
        ok: true,
        data: { kind: input.kind, patch: { [field]: { [targetLang]: translated } }, reviewNotes },
      };
    }

    // draft_from_passage
    const prompt = devotionDraftPrompt({
      contentLang: input.contentLang,
      scriptureReference: input.scriptureReference,
      scriptureExcerpt: input.scriptureExcerpt,
      seriesTheme: input.seriesTheme,
      pastorNotes: input.pastorNotes,
    });
    const res = await runAssist({ system: GLOBAL_SYSTEM_PROMPT, user: prompt, maxTokens: 1600 });
    const parsed = extractJson<Record<string, unknown>>(res.text);
    if (!parsed) return fail("parse_error", "could not parse AI output");
    const lang = input.contentLang;
    const patch: DevotionAssistResult["patch"] = {};
    const title = asString(parsed.title).trim();
    const bodyText = asString(parsed.devotional_body).trim();
    const refl = asString(parsed.reflection_question).trim();
    const prayer = asString(parsed.guided_prayer).trim();
    if (title) patch.title = { [lang]: title };
    if (bodyText) patch.body = { [lang]: bodyText };
    if (refl) patch.reflectionQuestion = { [lang]: refl };
    if (prayer) patch.prayerGuide = { [lang]: prayer };
    await logAssist(supabase, viewer, "pastor_assist.devotion_draft", input.contentItemId ?? null, {
      feature: "devotion_draft",
      model: res.model,
      tokens_in: res.usage.inputTokens,
      tokens_out: res.usage.outputTokens,
    });
    return {
      ok: true,
      data: {
        kind: input.kind,
        patch,
        centralMessage: asString(parsed.central_message).trim() || undefined,
        reviewNotes: asStringArray(parsed.review_notes),
      },
    };
  } catch (err) {
    if (err instanceof AssistNotConfiguredError) return fail("not_configured", "AI is not configured");
    return fail("error", err instanceof Error ? err.message : "assist failed");
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * 祈祷課題のセンシティブ確認（モデレータ限定・明示確認が前提）
 * ───────────────────────────────────────────────────────────────────────── */
export interface PrayerAssistInput {
  churchSlug: string;
  locale: Locale;
  contentId: string;
  /** モデレータが「本文を AI に送る」ことを明示確認したか。false は拒否。 */
  confirmed: boolean;
}

export async function runPrayerAssist(
  input: PrayerAssistInput,
): Promise<AssistActionResult<PrayerSensitiveReview>> {
  const ctx = await resolveChurchContext(input.churchSlug);
  if (!ctx) return fail("forbidden", "not a member");
  const { supabase, viewer } = ctx;

  // 権限: 祈祷確認はモデレータ以上（サーバー側で再確認）
  if (!canModerate(viewer)) return fail("forbidden", "moderator role required");
  // 教会設定: Pastor Assist が有効、かつ「祈祷本文を AI に送る」ことが許可されていること
  if (!viewer.church.pastorAssistEnabled) return fail("not_allowed", "pastor assist is not enabled");
  if (!viewer.church.allowPrayerAi) return fail("not_allowed", "sending prayer text to AI is not allowed for this church");
  // 明示確認が必須（送信前の同意モーダル）
  if (input.confirmed !== true) return fail("forbidden", "confirmation required");
  if (!isAssistConfigured()) return fail("not_configured", "AI is not configured");

  try {
    // 本文はクライアントを信用せず、サーバー側で id から再取得する。
    // **必ず viewer.church に限定** する（同意判定は viewer.church のフラグに対して
    // 行うため、本文の所属教会と一致していなければ越境同意バイパスになる）。
    const { data: row } = await supabase
      .from("content_items")
      .select("id, church_id, type, title, body, requested_visibility, visibility, anonymous")
      .eq("id", input.contentId)
      .eq("church_id", viewer.church.id)
      .eq("type", "prayer_request")
      .maybeSingle();
    if (!row) return fail("forbidden", "prayer request not found or not accessible");
    // 二重防御: フェッチ済み行の所属教会が同意判定に使った教会と一致することを明示確認。
    if (row.church_id !== viewer.church.id) {
      return fail("forbidden", "prayer request not found or not accessible");
    }

    // 会員名を辞書に、本文・タイトルから既定でリダクション
    const { data: members } = await supabase
      .from("memberships")
      .select("display_name")
      .eq("church_id", viewer.church.id);
    const names = (members ?? []).map((m: { display_name: string | null }) => m.display_name ?? "").filter(Boolean);

    const lang = viewer.church.contentLanguages[0] ?? viewer.church.defaultLocale;
    const rawBody = pickText(row.body, lang);
    const rawTitle = pickText(row.title, lang);
    const redBody = redactNames(rawBody, names);
    const redTitle = redactNames(rawTitle, names);

    const visibility = (row.requested_visibility as string) || (row.visibility as string) || "prayer_team";
    const prompt = prayerSensitiveReviewPrompt({
      contentLang: lang,
      visibility,
      title: redTitle.text,
      body: redBody.text,
      anonymous: Boolean(row.anonymous),
    });
    const res = await runAssist({ system: GLOBAL_SYSTEM_PROMPT, user: prompt, maxTokens: 1200 });
    const parsed = extractJson<Record<string, unknown>>(res.text);
    if (!parsed) return fail("parse_error", "could not parse AI output");

    const review: PrayerSensitiveReview = {
      riskLevel: toRisk(parsed.risk_level),
      flags: asStringArray(parsed.flags),
      visibilityConcern: asString(parsed.visibility_concern).trim(),
      suggestedSaferVisibility: toVisibility(parsed.suggested_safer_visibility, "prayer_team"),
      publicSummaryDraft: asString(parsed.public_summary_draft).trim(),
      moderatorNotes: asStringArray(parsed.moderator_notes),
      requiresHumanAttention: parsed.requires_human_attention !== false,
    };

    // 監査: 本文・名前は残さない。リスク度・フラグ数・リダクション件数のみ。
    await logAssist(supabase, viewer, "pastor_assist.prayer_review", input.contentId, {
      feature: "prayer_review",
      model: res.model,
      tokens_in: res.usage.inputTokens,
      tokens_out: res.usage.outputTokens,
      risk_level: review.riskLevel,
      flags: review.flags.length,
      names_redacted: redBody.redactedCount + redTitle.redactedCount,
    });

    return { ok: true, data: review };
  } catch (err) {
    if (err instanceof AssistNotConfiguredError) return fail("not_configured", "AI is not configured");
    return fail("error", err instanceof Error ? err.message : "assist failed");
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * 週次祈祷リスト（08 §9）: 承認済み課題を祈祷会・小グループ用に整理（モデレータ限定）
 * ───────────────────────────────────────────────────────────────────────── */
export type PrayerListAudience = "prayer_meeting" | "small_group" | "pastors";

export interface WeeklyPrayerListInput {
  churchSlug: string;
  locale: Locale;
  audience: PrayerListAudience;
  /** 名前を残すか（既定 false=リダクション）。pastors 監査用途以外は false 推奨。 */
  includeNames: boolean;
  /** 承認済み課題を AI に送ることの明示確認。false は拒否。 */
  confirmed: boolean;
}

export async function assistWeeklyPrayerList(
  input: WeeklyPrayerListInput,
): Promise<AssistActionResult<WeeklyPrayerList>> {
  const ctx = await resolveChurchContext(input.churchSlug);
  if (!ctx) return fail("forbidden", "not a member");
  const { supabase, viewer } = ctx;

  if (!canModerate(viewer)) return fail("forbidden", "moderator role required");
  if (!viewer.church.pastorAssistEnabled) return fail("not_allowed", "pastor assist is not enabled");
  if (!viewer.church.allowPrayerAi) return fail("not_allowed", "sending prayer text to AI is not allowed for this church");
  if (input.confirmed !== true) return fail("forbidden", "confirmation required");
  if (!isAssistConfigured()) return fail("not_configured", "AI is not configured");

  try {
    // 承認済み（published）の祈祷課題のみ。pending/rejected は絶対に含めない。
    // 期限切れも除外。RLS が教会分離を担保するが、明示的に church_id も絞る。
    const nowIso = new Date().toISOString();
    const { data: rows } = await supabase
      .from("content_items")
      .select("id, church_id, title, body, visibility, anonymous, expires_at")
      .eq("church_id", viewer.church.id)
      .eq("type", "prayer_request")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(60);

    // 対象者に応じて公開範囲を絞る。pastor_only は audience=pastors のときだけ含める。
    // church_id は二重防御で明示チェック（runPrayerAssist と同じパラノイア）。
    const audienceIsPastors = input.audience === "pastors";
    const eligible = (rows ?? []).filter(
      (r: { church_id: string; visibility: string; expires_at: string | null }) => {
        if (r.church_id !== viewer.church.id) return false;
        if (r.expires_at && r.expires_at < nowIso) return false;
        if (r.visibility === "pastor_only" && !audienceIsPastors) return false;
        return true;
      },
    );

    if (eligible.length === 0) {
      return { ok: true, data: { sections: [], consentWarnings: [], moderatorNotes: [], sourceCount: 0 } };
    }

    // 名前辞書（既定でリダクション。includeNames=true のときは残す）
    const { data: members } = await supabase
      .from("memberships")
      .select("display_name")
      .eq("church_id", viewer.church.id);
    const names = (members ?? []).map((m: { display_name: string | null }) => m.display_name ?? "").filter(Boolean);

    const lang = viewer.church.contentLanguages[0] ?? viewer.church.defaultLocale;
    let redactedTotal = 0;
    const lines = eligible.map((r: { title: unknown; body: unknown; visibility: string; anonymous: boolean }) => {
      const title = pickText(r.title, lang);
      const body = pickText(r.body, lang);
      const combined = [title, body].filter(Boolean).join(" — ");
      if (input.includeNames) return `- [${r.visibility}] ${combined}`;
      const red = redactNames(combined, names);
      redactedTotal += red.redactedCount;
      return `- [${r.visibility}] ${red.text}`;
    });

    const prompt = weeklyPrayerListPrompt({
      contentLang: lang,
      approvedRequests: lines.join("\n"),
      includeNames: input.includeNames,
      audience: input.audience,
    });
    const res = await runAssist({ system: GLOBAL_SYSTEM_PROMPT, user: prompt, maxTokens: 1600 });
    const parsed = extractJson<Record<string, unknown>>(res.text);
    if (!parsed) return fail("parse_error", "could not parse AI output");

    const sections: WeeklyPrayerListSection[] = Array.isArray(parsed.sections)
      ? parsed.sections
          .map((s) => {
            const o = (s ?? {}) as Record<string, unknown>;
            return { heading: asString(o.heading).trim(), items: asStringArray(o.items) };
          })
          .filter((s) => s.heading || s.items.length > 0)
      : [];

    const data: WeeklyPrayerList = {
      sections,
      consentWarnings: asStringArray(parsed.consent_warnings),
      moderatorNotes: asStringArray(parsed.moderator_notes),
      sourceCount: eligible.length,
    };

    await logAssist(supabase, viewer, "pastor_assist.weekly_prayer_list", null, {
      feature: "weekly_prayer_list",
      model: res.model,
      tokens_in: res.usage.inputTokens,
      tokens_out: res.usage.outputTokens,
      audience: input.audience,
      include_names: input.includeNames,
      source_count: eligible.length,
      names_redacted: redactedTotal,
    });

    return { ok: true, data };
  } catch (err) {
    if (err instanceof AssistNotConfiguredError) return fail("not_configured", "AI is not configured");
    return fail("error", err instanceof Error ? err.message : "assist failed");
  }
}

/** jsonb 多言語テキストから代表文字列を取り出す（指定言語→最初の非空値）。 */
function pickText(v: unknown, lang: string): string {
  if (!v || typeof v !== "object") return "";
  const m = v as Record<string, string | undefined>;
  if (typeof m[lang] === "string" && m[lang]!.trim()) return m[lang]!;
  const first = Object.values(m).find((x) => typeof x === "string" && x.trim().length > 0);
  return first ?? "";
}
