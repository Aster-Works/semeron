"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, UserRound } from "lucide-react";
import type { ContentItem, Locale, Visibility } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { localize } from "@/app/lib/i18n";
import { moderatePrayer } from "@/app/lib/db/actions";
import { PrayerAssistPanel } from "@/app/components/admin/PrayerAssistPanel";
import {
  Button,
  Callout,
  Card,
  CardBody,
  Field,
  SensitiveFlags,
  Textarea,
  VisibilityBadge,
} from "@/app/components/ui";

const VIS: Visibility[] = ["pastor_only", "elders", "prayer_team", "group", "church", "anonymous_church"];

/** 承認前の祈祷課題1件。公開範囲の見直し・本文編集・判断メモを一箇所で。 */
export function ModerationCard({
  item,
  authorName,
  churchSlug,
  locale,
  churchDefaultLocale,
  assistEnabled = false,
  allowPrayerAi = false,
  visLabels,
}: {
  item: ContentItem;
  authorName: string;
  churchSlug: string;
  locale: Locale;
  churchDefaultLocale: Locale;
  /** 教会設定 pastor_assist_enabled。 */
  assistEnabled?: boolean;
  /** 教会設定 allow_prayer_ai（祈祷本文の AI 送信可否）。 */
  allowPrayerAi?: boolean;
  /** 教会別の公開範囲の呼び方。省略時は標準ラベル。 */
  visLabels?: Partial<Record<Visibility, string>>;
}) {
  const { t } = useLocale();

  const requested = item.requestedVisibility ?? item.visibility;
  const recommended = recommend(requested, item);

  const [publicText, setPublicText] = useState(localize(item.body, locale, churchDefaultLocale));
  const [chosen, setChosen] = useState<Visibility>(recommended);
  const [note, setNote] = useState("");
  const [resolved, setResolved] = useState<null | "approved" | "rejected" | "needs_revision">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const decide = (decision: "approved" | "rejected" | "needs_revision") => {
    setError(null);
    startTransition(async () => {
      const res = await moderatePrayer({
        churchSlug,
        locale,
        contentId: item.id,
        decision,
        visibility: decision === "approved" ? chosen : undefined,
        publicBody: decision === "approved" ? publicText : undefined,
        note: note || undefined,
      });
      if (res.ok) setResolved(decision);
      else setError(res.error);
    });
  };

  if (resolved) {
    return (
      <Card>
        <CardBody className="flex items-center gap-2 text-sm text-sage-ink">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {t(
            resolved === "approved"
              ? "moderation.approve"
              : resolved === "rejected"
                ? "moderation.reject"
                : "moderation.askRevision",
          )}{" "}
          — {locale === "ja" ? "処理しました" : "done"}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card as="article">
      <CardBody className="space-y-4">
        {/* 投稿者（モデレーターには匿名でも実名が見える） + 希望/推奨 */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cedar-soft text-cedar-ink">
              <UserRound className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-muted">{t("moderation.author")}</p>
              <p className="text-sm font-medium text-ink">{authorName}</p>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs text-muted">{t("moderation.requestedVisibility")}:</span>
              <VisibilityBadge visibility={requested} locale={locale} label={visLabels?.[requested]} />
            </div>
          </div>
        </div>

        {/* 本文 */}
        <div>
          <h3 className="text-base font-semibold text-ink text-balance-safe">
            {localize(item.title, locale, churchDefaultLocale)}
          </h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">
            {localize(item.body, locale, churchDefaultLocale)}
          </p>
        </div>

        {item.sensitiveFlags && item.sensitiveFlags.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-muted">{t("moderation.flags")}</p>
            <SensitiveFlags flags={item.sensitiveFlags} locale={locale} />
          </div>
        ) : null}

        {item.includesThirdParty ? (
          <Callout tone="rose">{t("moderation.thirdPartyWarn")}</Callout>
        ) : null}

        {/* センシティブ確認（AI）。承認とは分離。提案のみ。 */}
        <PrayerAssistPanel
          visLabels={visLabels}
          churchSlug={churchSlug}
          contentId={item.id}
          assistEnabled={assistEnabled}
          allowPrayerAi={allowPrayerAi}
          onApplySummary={setPublicText}
          onApplyVisibility={setChosen}
        />

        {/* 公開用本文（編集可） + 公開範囲の見直し */}
        <Field label={t("moderation.publicEdit")} htmlFor={`pub-${item.id}`}>
          <Textarea
            id={`pub-${item.id}`}
            value={publicText}
            onChange={(e) => setPublicText(e.target.value)}
            rows={3}
          />
        </Field>

        <Field label={t("moderation.recommendedVisibility")} htmlFor={`vis-${item.id}`}>
          <div className="flex flex-wrap gap-1.5">
            {VIS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setChosen(v)}
                aria-pressed={chosen === v}
                className={
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
                  (chosen === v
                    ? "border-sage bg-sage-soft text-sage-ink ring-1 ring-sage/30"
                    : "border-line-strong bg-surface text-muted hover:text-ink")
                }
              >
                {visLabels?.[v] ?? t(`visibility.${v}`)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("moderation.decisionNote")} htmlFor={`note-${item.id}`}>
          <Textarea
            id={`note-${item.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </Field>

        {error ? <Callout tone="rose">{error}</Callout> : null}

        {/* 決定 */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="danger" size="sm" disabled={pending} onClick={() => decide("rejected")}>
            {t("moderation.reject")}
          </Button>
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => decide("needs_revision")}>
            {t("moderation.askRevision")}
          </Button>
          <Button size="sm" disabled={pending} onClick={() => decide("approved")}>
            {t("moderation.approve")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/** 広い希望 + センシティブなら、狭い範囲を推奨（AIではなく素朴なルール）。 */
function recommend(requested: Visibility, item: ContentItem): Visibility {
  const broad = requested === "church" || requested === "anonymous_church";
  const sensitive = (item.sensitiveFlags?.length ?? 0) > 0 || item.includesThirdParty;
  if (broad && sensitive) return "prayer_team";
  return requested;
}
