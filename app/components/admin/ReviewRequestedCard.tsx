"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ShieldAlert, Undo2, UserRound } from "lucide-react";
import type { ContentItem, Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { localize } from "@/app/lib/i18n";
import { resolveAdminReview } from "@/app/lib/db/actions";
import { Button, Callout, Card, CardBody, SensitiveFlags, VisibilityBadge } from "@/app/components/ui";

/**
 * 会員から「確認を依頼」された公開中の祈祷課題1件。
 * 対応は2択: 問題なしとして完了（公開維持） / 再審査に回す（承認待ちへ差し戻し）。
 * 差し戻した課題は既存の承認キュー（ModerationCard）で通常どおり扱える。
 */
export function ReviewRequestedCard({
  item,
  authorName,
  churchId,
  churchSlug,
  locale,
  churchDefaultLocale,
  requestedAtLabel,
  visLabel,
}: {
  item: ContentItem;
  authorName: string;
  churchId: string;
  churchSlug: string;
  locale: Locale;
  churchDefaultLocale: Locale;
  /** 依頼日時の表示ラベル（サーバー側で整形済み）。 */
  requestedAtLabel?: string;
  visLabel?: string;
}) {
  const { t } = useLocale();
  const [resolved, setResolved] = useState<null | "resolve" | "reReview">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const act = (action: "resolve" | "reReview") => {
    setError(null);
    startTransition(async () => {
      const res = await resolveAdminReview({ churchId, churchSlug, locale, contentId: item.id, action });
      if (res.ok) setResolved(action);
      else setError(res.error);
    });
  };

  if (resolved) {
    return (
      <Card>
        <CardBody className="flex items-center gap-2 text-sm text-sage-ink">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {resolved === "resolve"
            ? t("moderation.requested.resolvedMsg")
            : t("moderation.requested.reReviewedMsg")}
        </CardBody>
      </Card>
    );
  }

  const requestCount = Number(item.metadata?.admin_review_request_count ?? 1);

  return (
    <Card as="article" className="border-gold/30">
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-ink">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            {t("moderation.requested.badge")}
            {requestCount > 1 ? (
              <span className="tabular-nums">×{requestCount}</span>
            ) : null}
          </span>
          {requestedAtLabel ? (
            <time className="text-xs text-muted">{requestedAtLabel}</time>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
            <UserRound className="h-4 w-4 text-muted" aria-hidden />
            {authorName}
          </span>
          <VisibilityBadge visibility={item.visibility} locale={locale} label={visLabel} />
        </div>

        <div>
          <h3 className="text-base font-semibold text-ink text-balance-safe">
            {localize(item.title, locale, churchDefaultLocale)}
          </h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">
            {localize(item.body, locale, churchDefaultLocale)}
          </p>
        </div>

        {item.sensitiveFlags && item.sensitiveFlags.length > 0 ? (
          <SensitiveFlags flags={item.sensitiveFlags} locale={locale} />
        ) : null}

        {error ? <Callout tone="rose">{error}</Callout> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" size="md" disabled={pending} onClick={() => act("reReview")}>
            <Undo2 className="h-4 w-4" aria-hidden />
            {t("moderation.requested.reReview")}
          </Button>
          <Button size="md" disabled={pending} onClick={() => act("resolve")}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t("moderation.requested.resolve")}
          </Button>
        </div>
        <p className="text-xs text-muted text-balance-safe">{t("moderation.requested.reReviewHint")}</p>
      </CardBody>
    </Card>
  );
}
