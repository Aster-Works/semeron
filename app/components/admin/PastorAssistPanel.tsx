"use client";

import { useState, useTransition } from "react";
import { Info, Sparkles, Wand2, Languages } from "lucide-react";
import type { Locale, Localized } from "@/app/lib/demo/types";
import { createT, type MessageId } from "@/app/lib/i18n";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { languageName } from "@/app/lib/i18n/languages";
import { Button, Callout } from "@/app/components/ui";
import { assistDevotionDraft } from "@/app/lib/pastor-assist/actions";
import type { DevotionAssistResult, ReflectionQuestionOption } from "@/app/lib/pastor-assist/types";

/**
 * Pastor Assist（AI）パネル（07 Phase 5）。
 * - AI補助は「Publish」とは視覚的に分離する（08 §11 / 05 §7）。破線・別トーンの箱。
 * - **AIは下書き・提案のみ。** 反映は牧師が明示クリックし、保存は別操作。自動配信しない。
 * - 教会設定 pastor_assist_enabled が無効なら、従来の無効プレースホルダを表示。
 */
export function PastorAssistPanel({
  churchSlug,
  contentItemId,
  assistEnabled,
  languages,
  primary,
  scriptureRef,
  current,
  onApplyDraft,
  actions,
}: {
  churchSlug: string;
  contentItemId?: string;
  assistEnabled: boolean;
  languages: string[];
  primary: string;
  scriptureRef: string;
  current: {
    title: Localized;
    body: Localized;
    reflectionQuestion: Localized;
    prayerGuide: Localized;
  };
  onApplyDraft: (patch: DevotionAssistResult["patch"]) => void;
  actions: MessageId[];
}) {
  if (!assistEnabled) return <DisabledPanel actions={actions} />;
  return (
    <EnabledPanel
      churchSlug={churchSlug}
      contentItemId={contentItemId}
      languages={languages}
      primary={primary}
      scriptureRef={scriptureRef}
      current={current}
      onApplyDraft={onApplyDraft}
    />
  );
}

/* ── 無効時（Phase 1 と同じ見た目の無効プレースホルダ）───────────────────── */
function DisabledPanel({ actions }: { actions: MessageId[] }) {
  const { t } = useLocale();
  return (
    <PanelShell>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a}
            type="button"
            disabled
            aria-disabled="true"
            title={t("assist.disabled")}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm font-medium text-muted opacity-70"
          >
            <Wand2 className="h-4 w-4" aria-hidden />
            {t(a)}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <Callout tone="sage" icon={Info}>
          {t("assist.disabled")}
        </Callout>
        <p className="text-xs text-muted text-balance-safe">{t("assist.separateNote")}</p>
      </div>
    </PanelShell>
  );
}

/* ── 有効時（対話的な下書き補助）─────────────────────────────────────────── */
function EnabledPanel({
  churchSlug,
  contentItemId,
  languages,
  primary,
  scriptureRef,
  current,
  onApplyDraft,
}: {
  churchSlug: string;
  contentItemId?: string;
  languages: string[];
  primary: string;
  scriptureRef: string;
  current: {
    title: Localized;
    body: Localized;
    reflectionQuestion: Localized;
    prayerGuide: Localized;
  };
  onApplyDraft: (patch: DevotionAssistResult["patch"]) => void;
}) {
  const { t, locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [draft, setDraft] = useState<DevotionAssistResult | null>(null);
  const [questions, setQuestions] = useState<ReflectionQuestionOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const otherLangs = languages.filter((l) => l !== primary);
  const [targetLang, setTargetLang] = useState<string>(otherLangs[0] ?? "");

  const reset = () => {
    setDraft(null);
    setQuestions(null);
    setError(null);
    setApplied(false);
  };

  const call = (input: Parameters<typeof assistDevotionDraft>[0], kind: string) => {
    setBusyKind(kind);
    reset();
    startTransition(async () => {
      const res = await assistDevotionDraft(input);
      setBusyKind(null);
      if (!res.ok) {
        setError(res.code === "not_configured" ? t("assist.notConfigured") : t("assist.error"));
        return;
      }
      if (res.data.questionOptions) setQuestions(res.data.questionOptions);
      else setDraft(res.data);
    });
  };

  const draftFromPassage = () => {
    if (!scriptureRef.trim()) {
      reset();
      setError(t("assist.needScripture"));
      return;
    }
    call(
      {
        churchSlug,
        locale: locale as Locale,
        kind: "draft_from_passage",
        contentLang: primary,
        contentItemId,
        scriptureReference: scriptureRef,
      },
      "draft_from_passage",
    );
  };

  const suggestQuestions = () => {
    call(
      {
        churchSlug,
        locale: locale as Locale,
        kind: "suggest_questions",
        contentLang: primary,
        contentItemId,
        scriptureReference: scriptureRef || undefined,
        centralMessage: current.title[primary] || current.body[primary]?.slice(0, 200) || undefined,
      },
      "suggest_questions",
    );
  };

  const translate = () => {
    const source = current.body[primary]?.trim();
    if (!source) {
      reset();
      setError(t("assist.needText"));
      return;
    }
    if (!targetLang) return;
    call(
      {
        churchSlug,
        locale: locale as Locale,
        kind: "translate",
        contentLang: targetLang,
        contentItemId,
        sourceLang: primary,
        targetLang,
        sourceText: source,
        translateField: "body",
      },
      "translate",
    );
  };

  const applyDraft = () => {
    if (!draft) return;
    onApplyDraft(draft.patch);
    setDraft(null);
    setApplied(true);
  };

  const applyQuestion = (q: string) => {
    onApplyDraft({ reflectionQuestion: { [primary]: q } });
    setQuestions(null);
    setApplied(true);
  };

  const busy = pending || busyKind !== null;

  return (
    <PanelShell>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={draftFromPassage} disabled={busy}>
          <Wand2 className="h-4 w-4" aria-hidden />
          {busyKind === "draft_from_passage" ? t("assist.generating") : t("assist.draftFromPassage")}
        </Button>
        <Button variant="secondary" size="sm" onClick={suggestQuestions} disabled={busy}>
          <Wand2 className="h-4 w-4" aria-hidden />
          {busyKind === "suggest_questions" ? t("assist.generating") : t("assist.suggestQuestions")}
        </Button>
        {otherLangs.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1">
            <Languages className="h-4 w-4 text-muted" aria-hidden />
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent text-sm focus:outline-none"
              aria-label={t("assist.translateTo")}
              disabled={busy}
            >
              {otherLangs.map((l) => (
                <option key={l} value={l}>
                  {languageName(l)}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={translate} disabled={busy}>
              {busyKind === "translate" ? t("assist.generating") : t("assist.translate")}
            </Button>
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted text-balance-safe">{t("assist.advisoryDraft")}</p>

      {error ? <p className="mt-2 text-sm text-rose-ink">{error}</p> : null}
      {applied ? <p className="mt-2 text-sm text-sage-strong">{t("assist.applied")}</p> : null}

      {questions ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-ink">{t("assist.pickQuestion")}</p>
          <ul className="space-y-1.5">
            {questions.map((q, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => applyQuestion(q.question)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm text-ink hover:bg-mist"
                >
                  {q.question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft ? (
        <div className="mt-3 space-y-2 rounded-xl border border-sage/40 bg-surface p-3">
          <span className="inline-block rounded-full border border-sage/40 bg-sage-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-sage-ink">
            {t("assist.draftLabel")}
          </span>
          {draft.centralMessage ? (
            <p className="text-xs text-muted">
              <span className="font-medium">{t("assist.centralMessage")}:</span> {draft.centralMessage}
            </p>
          ) : null}
          <DraftPreview patch={draft.patch} lang={targetLang || primary} />
          {draft.reviewNotes.length > 0 ? (
            <div className="text-xs text-muted">
              <p className="font-medium">{t("assist.reviewNotes")}</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {draft.reviewNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button variant="primary" size="sm" onClick={applyDraft}>
            {t("assist.applyDraft")}
          </Button>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted text-balance-safe">{t("assist.separateNote")}</p>
    </PanelShell>
  );
}

/** ドラフトの本文プレビュー（該当言語の入っているフィールドのみ）。 */
function DraftPreview({ patch, lang }: { patch: DevotionAssistResult["patch"]; lang: string }) {
  const rows: { key: string; value?: string }[] = [
    { key: "title", value: patch.title?.[lang] },
    { key: "body", value: patch.body?.[lang] },
    { key: "reflectionQuestion", value: patch.reflectionQuestion?.[lang] },
    { key: "prayerGuide", value: patch.prayerGuide?.[lang] },
  ];
  return (
    <div className="space-y-1.5 text-sm text-ink">
      {rows
        .filter((r) => r.value)
        .map((r) => (
          <p key={r.key} className="whitespace-pre-wrap text-balance-safe">
            {r.value}
          </p>
        ))}
    </div>
  );
}

/* ── 共通の外枠（見出し + AIバッジ）───────────────────────────────────────── */
function PanelShell({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const t = createT(locale as Locale);
  return (
    <section
      aria-label={t("assist.title")}
      className="rounded-2xl border border-dashed border-sage/50 bg-sage-soft/40 p-4 sm:p-5"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sage-soft text-sage-ink">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{t("assist.title")}</h3>
            <span className="rounded-full border border-sage/40 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sage-ink">
              AI
            </span>
          </div>
          <p className="text-xs text-muted">{t("assist.subtitle")}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
