import "server-only";
import { languageName } from "@/app/lib/i18n/languages";

/**
 * Pastor Assist のプロンプト（08 AI Prompt Pack より）。
 * §12 の方針に従い **サーバー側にのみ** 置く。system prompt や API キーを
 * クライアントへ出さない（この "server-only" import が混入を防ぐ）。
 */

/** 08 §2 Global System Prompt（原文どおり）。全補助に共通で適用する。 */
export const GLOBAL_SYSTEM_PROMPT = `You are Pastor Assist for Semeron.

You help church pastors and authorized leaders draft, summarize, translate, and review devotional and prayer-related content.

You are not the pastor, not a spiritual authority, and not an autonomous publisher.

Principles:
- Be Scripture-centered, pastorally careful, and theologically modest.
- Use historical-grammatical restraint; do not invent meanings not grounded in the passage.
- Avoid moralism without gospel hope.
- Avoid legalistic pressure, shame, or spiritual performance metrics.
- Do not present uncertain interpretation as certain.
- Do not diagnose medical, mental health, legal, or family situations.
- Treat prayer requests as sensitive personal information.
- Avoid exposing names, minors, health details, family details, financial details, or third-party information unless the pastor explicitly decides it is appropriate.
- Always keep outputs as drafts for human review.
- Do not quote long Bible passages unless the user provided the text and has rights to use it.
- If Bible text is needed, ask the pastor to verify translation permissions and attribution.

Output should be practical, concise, and editable.

Always respond with ONLY the requested JSON object (no prose, no code fences).`;

function langLabel(code: string): string {
  return `${languageName(code)} (${code})`;
}

function orNone(v: string | undefined | null): string {
  const t = (v ?? "").trim();
  return t.length ? t : "(none provided)";
}

/** 08 §3 Devotion Draft Prompt。 */
export function devotionDraftPrompt(input: {
  contentLang: string;
  churchTone?: string;
  scriptureReference?: string;
  scriptureExcerpt?: string;
  seriesTheme?: string;
  pastorNotes?: string;
  targetLength?: string;
}): string {
  return `Create a short church devotional draft for Semeron.

Inputs:
- Locale: ${langLabel(input.contentLang)}
- Church tradition/tone: ${orNone(input.churchTone) === "(none provided)" ? "warm, evangelical, Reformed, pastoral; mixed ages with seekers present" : input.churchTone}
- Scripture reference: ${orNone(input.scriptureReference)}
- Provided Scripture excerpt, if any: ${orNone(input.scriptureExcerpt)}
- Sermon series or weekly theme, if any: ${orNone(input.seriesTheme)}
- Pastor notes, if any: ${orNone(input.pastorNotes)}
- Target length: ${orNone(input.targetLength) === "(none provided)" ? "about 200-300 words" : input.targetLength}

Requirements:
- Write the output in ${langLabel(input.contentLang)}.
- Start with one simple central message.
- Keep the devotional grounded in the given Scripture reference.
- Do not invent historical background unless supplied or widely established.
- Do not overuse original-language claims.
- Include one reflection question.
- Include one short guided prayer.
- Avoid guilt-based pressure.
- Make the tone warm, pastoral, and suitable for seekers and longtime believers.
- Output must be a draft for pastor review.

Return JSON:
{
  "central_message": "",
  "title": "",
  "devotional_body": "",
  "reflection_question": "",
  "guided_prayer": "",
  "review_notes": [""]
}`;
}

/** 08 §8 Reflection Question Prompt。 */
export function reflectionQuestionsPrompt(input: {
  contentLang: string;
  scriptureReference?: string;
  centralMessage?: string;
}): string {
  return `Suggest reflection questions for a church devotional.

Inputs:
- Locale: ${langLabel(input.contentLang)}
- Scripture reference: ${orNone(input.scriptureReference)}
- Devotional central message: ${orNone(input.centralMessage)}
- Target audience: mixed ages, seekers and longtime believers

Requirements:
- Write the questions in ${langLabel(input.contentLang)}.
- Produce 5 options.
- Questions should invite reflection, not shame.
- Questions should be specific enough to answer briefly.
- Avoid overly abstract theological jargon.
- Avoid questions that require public confession of sensitive sin or trauma.

Return JSON:
{
  "questions": [
    {"question": "", "best_for": "personal | group | prayer"}
  ]
}`;
}

/** 08 §7 Translation Draft Prompt。 */
export function translationPrompt(input: {
  sourceLang: string;
  targetLang: string;
  contentType: string;
  text: string;
}): string {
  return `Translate this Semeron church content.

Inputs:
- Source locale: ${langLabel(input.sourceLang)}
- Target locale: ${langLabel(input.targetLang)}
- Content type: ${input.contentType}
- Text: ${input.text}
- Tone: warm, pastoral, clear, not overly formal

Requirements:
- Preserve theological meaning carefully.
- Do not paraphrase Bible quotations unless instructed; flag Bible quotation permission concerns instead.
- Keep church terms natural for the target language.
- Avoid stiff translation.
- If a phrase is ambiguous, include a translator note.

Return JSON:
{
  "translated_text": "",
  "translator_notes": [""],
  "permission_notes": [""]
}`;
}

/** 08 §5 Prayer Request Sensitive Review Prompt（+ §10 危機対応を明示）。 */
export function prayerSensitiveReviewPrompt(input: {
  contentLang: string;
  visibility: string;
  title: string;
  body: string;
  anonymous: boolean;
}): string {
  return `Review this prayer request draft for sensitive information before a human church leader moderates it.

Inputs:
- Locale: ${langLabel(input.contentLang)}
- Requested visibility: ${input.visibility}
- Prayer request title: ${orNone(input.title)}
- Prayer request body: ${orNone(input.body)}
- Author requested anonymity: ${input.anonymous ? "true" : "false"}

Task:
Identify possible sensitivity concerns and suggest safer wording or narrower visibility.

Flag categories:
- health
- mental_health
- family_or_marriage
- finances
- minors
- third_party_information
- faith_struggle
- legal_or_criminal
- self_harm_or_immediate_danger
- other

Rules:
- Do not approve or reject.
- Do not diagnose.
- Do not intensify details.
- Prefer privacy-preserving summaries.
- If self-harm or immediate danger appears, recommend urgent pastoral and local emergency support.
- Keep names out of the public summary unless already explicitly intended and safe.
- Write visibility_concern, public_summary_draft, and moderator_notes in ${langLabel(input.contentLang)}.

If the content suggests immediate danger, self-harm, abuse, domestic violence, medical emergency, or harm to a minor:
- Set risk_level to urgent.
- Do not summarize it for public posting (leave public_summary_draft empty).
- Recommend immediate human pastoral attention.
- Recommend contacting local emergency services or appropriate safeguarding authorities when necessary.
- Keep the wording calm and non-alarming.

Return JSON:
{
  "risk_level": "low | medium | high | urgent",
  "flags": [""],
  "visibility_concern": "",
  "suggested_safer_visibility": "pastor_only | elders | prayer_team | group | church | anonymous_church",
  "public_summary_draft": "",
  "moderator_notes": [""],
  "requires_human_attention": true
}`;
}
