"use client";

import { useState, useTransition } from "react";
import { Sparkles, ShieldAlert, TriangleAlert } from "lucide-react";
import type { Locale, SensitiveFlag, Visibility } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { Button, Callout, SensitiveFlags, VisibilityBadge } from "@/app/components/ui";
import { runPrayerAssist } from "@/app/lib/pastor-assist/actions";
import type { PrayerSensitiveReview, AssistRiskLevel } from "@/app/lib/pastor-assist/types";

const VALID_FLAGS: SensitiveFlag[] = [
  "health",
  "mental_health",
  "family_or_marriage",
  "finances",
  "minors",
  "third_party_information",
  "faith_struggle",
  "legal_or_criminal",
  "self_harm_or_immediate_danger",
  "other",
];

const RISK_TONE: Record<AssistRiskLevel, string> = {
  low: "border-sage/40 bg-sage-soft text-sage-ink",
  medium: "border-gold/40 bg-gold-soft text-gold-ink",
  high: "border-rose/40 bg-rose-soft text-rose-ink",
  urgent: "border-rose/60 bg-rose-soft text-rose-ink",
};

/**
 * 祈祷課題のセンシティブ確認（AI）。モデレーションキュー内。
 * - 承認/却下とは完全に分離。提案のみで、決定はモデレータが行う。
 * - 本文を AI に送る前に必ず明示確認（confirmWarn）。
 * - 教会設定 pastor_assist_enabled かつ allow_prayer_ai が必要。
 */
export function PrayerAssistPanel({
  churchSlug,
  contentId,
  assistEnabled,
  allowPrayerAi,
  onApplySummary,
  onApplyVisibility,
}: {
  churchSlug: string;
  contentId: string;
  assistEnabled: boolean;
  allowPrayerAi: boolean;
  onApplySummary: (text: string) => void;
  onApplyVisibility: (v: Visibility) => void;
}) {
  const { t, locale } = useLocale();
  const [stage, setStage] = useState<"idle" | "confirm" | "result">("idle");
  const [pending, startTransition] = useTransition();
  const [review, setReview] = useState<PrayerSensitiveReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 無効時: 従来の静的プレースホルダ（+ 祈祷AIが未許可なら案内）
  if (!assistEnabled) {
    return <DisabledBlock note={t("assist.disabled")} extra={t("assist.separateNote")} />;
  }
  if (!allowPrayerAi) {
    return (
      <DisabledBlock note={t("assist.review.disabledPrayerAi")} extra={t("assist.separateNote")} />
    );
  }

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await runPrayerAssist({ churchSlug, locale: locale as Locale, contentId, confirmed: true });
      if (res.ok) {
        setReview(res.data);
        setStage("result");
      } else {
        setError(res.code === "not_configured" ? t("assist.notConfigured") : t("assist.error"));
        setStage("idle");
      }
    });
  };

  const flags = review ? review.flags.filter((f): f is SensitiveFlag => (VALID_FLAGS as string[]).includes(f)) : [];

  return (
    <section
      aria-label={t("assist.review.title")}
      className="rounded-xl border border-dashed border-sage/50 bg-sage-soft/30 p-3"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-sage-ink">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("assist.review.title")}
        <span className="rounded-full border border-sage/40 bg-surface px-1.5 text-[10px] uppercase">AI</span>
      </div>

      {stage === "idle" ? (
        <div className="mt-2 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => setStage("confirm")} disabled={pending}>
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("assist.review.run")}
          </Button>
          {error ? <p className="text-xs text-rose-ink">{error}</p> : null}
        </div>
      ) : null}

      {stage === "confirm" ? (
        <div className="mt-2 space-y-2">
          <Callout tone="gold" icon={ShieldAlert}>
            {t("assist.review.confirmWarn")}
          </Callout>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={run} disabled={pending}>
              {pending ? t("assist.generating") : t("assist.review.confirm")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStage("idle")} disabled={pending}>
              {t("assist.review.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {stage === "result" && review ? (
        <div className="mt-2 space-y-3 text-sm">
          {review.riskLevel === "urgent" ? (
            <Callout tone="rose" icon={TriangleAlert}>
              {t("assist.review.urgent")}
            </Callout>
          ) : null}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{t("assist.review.riskLevel")}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${RISK_TONE[review.riskLevel]}`}
            >
              {t(`assist.risk.${review.riskLevel}`)}
            </span>
          </div>

          {flags.length > 0 ? <SensitiveFlags flags={flags} locale={locale as Locale} /> : null}

          {review.visibilityConcern ? (
            <div>
              <p className="text-xs text-muted">{t("assist.review.concern")}</p>
              <p className="text-balance-safe">{review.visibilityConcern}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{t("assist.review.suggestedVisibility")}</span>
            <VisibilityBadge visibility={review.suggestedSaferVisibility} locale={locale as Locale} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApplyVisibility(review.suggestedSaferVisibility)}
            >
              {t("assist.review.applyVisibility")}
            </Button>
          </div>

          {review.publicSummaryDraft ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted">{t("assist.review.summaryDraft")}</p>
              <p className="rounded-lg border border-line bg-surface p-2 text-balance-safe">
                {review.publicSummaryDraft}
              </p>
              <Button variant="secondary" size="sm" onClick={() => onApplySummary(review.publicSummaryDraft)}>
                {t("assist.review.applySummary")}
              </Button>
            </div>
          ) : null}

          {review.moderatorNotes.length > 0 ? (
            <div>
              <p className="text-xs text-muted">{t("assist.review.notes")}</p>
              <ul className="list-disc space-y-0.5 pl-5 text-balance-safe">
                {review.moderatorNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Callout tone="neutral">{t("assist.review.advisoryNote")}</Callout>
        </div>
      ) : null}
    </section>
  );
}

function DisabledBlock({ note, extra }: { note: string; extra: string }) {
  const t = useLocale().t;
  return (
    <div className="rounded-xl border border-dashed border-sage/40 bg-sage-soft/30 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-sage-ink">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("moderation.aiSummary")}
        <span className="rounded-full border border-sage/40 bg-surface px-1.5 text-[10px] uppercase">AI</span>
      </div>
      <p className="mt-1 text-xs text-muted text-balance-safe">{note}</p>
      <p className="mt-1 text-xs text-muted text-balance-safe">{extra}</p>
    </div>
  );
}
