import { CalendarClock } from "lucide-react";
import type { Church, Locale } from "@/app/lib/demo/types";
import type { PrayerVM } from "@/app/lib/db/queries";
import { localize, createT } from "@/app/lib/i18n";
import { resolveRoleLabels, visibilityLabel } from "@/app/lib/roleLabels";
import { formatMonthDay } from "@/app/lib/utils";
import {
  Avatar,
  Badge,
  Callout,
  Card,
  CardBody,
  OutcomeBadge,
  SensitiveFlags,
  StatusPill,
  VisibilityBadge,
} from "@/app/components/ui";
import { ReactionBar } from "./ReactionBar";
import { MyPrayerActions } from "./MyPrayerActions";

/** 祈祷課題カード（実データ VM 版）。公開範囲・作者（匿名尊重）・状態を明示。 */
export function PrayerCard({
  vm,
  church,
  locale,
}: {
  vm: PrayerVM;
  church: Church;
  locale: Locale;
}) {
  const t = createT(locale);
  const { item, authorName, isMine } = vm;
  const visLabel = visibilityLabel(item.visibility, resolveRoleLabels(church, locale), locale);
  // 匿名投稿を本人が見たとき、「他者には匿名で出ている」ことを明示して信頼を担保する。
  const isAnon = item.anonymous || item.visibility === "anonymous_church";
  const showSelfAnon = isMine && isAnon;
  const displayName = showSelfAnon ? t("prayer.anonSelf") : authorName;
  const titleText = localize(item.title, locale, church.defaultLocale);
  const bodyText = localize(item.body, locale, church.defaultLocale);

  return (
    <Card as="article">
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={displayName} size="sm" />
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {isMine ? <Badge tone="slate">{t("prayer.mineBadge")}</Badge> : null}
            {item.status !== "published" ? <StatusPill status={item.status} locale={locale} /> : null}
            {item.prayerOutcome && item.prayerOutcome !== "open" ? (
              <OutcomeBadge outcome={item.prayerOutcome} locale={locale} />
            ) : null}
            <VisibilityBadge visibility={item.visibility} locale={locale} label={visLabel} />
          </div>
        </div>

        {showSelfAnon ? (
          <p className="text-xs text-muted text-balance-safe">{t("prayer.anonSelfNote")}</p>
        ) : null}

        <div>
          <h3 className="text-base font-semibold text-ink text-balance-safe">{titleText}</h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">
            {bodyText}
          </p>
        </div>

        {item.sensitiveFlags && item.sensitiveFlags.length > 0 ? (
          <SensitiveFlags flags={item.sensitiveFlags} locale={locale} />
        ) : null}

        {item.status === "pending_review" && isMine ? (
          <Callout tone="gold">{t("prayer.pendingNote")}</Callout>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          {item.status === "published" ? (
            <ReactionBar
              churchId={church.id}
              contentId={item.id}
              reactions={[{ type: "prayed", count: vm.prayedCount, active: vm.viewerPrayed }]}
            />
          ) : (
            <span />
          )}
          {item.expiresAt ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              {t("prayer.expiresOn")} {formatMonthDay(item.expiresAt, locale, church.timezone)}
            </span>
          ) : null}
        </div>

        {isMine && item.status !== "rejected" && item.status !== "archived" ? (
          <MyPrayerActions
            churchId={church.id}
            churchSlug={church.slug}
            contentId={item.id}
            initialTitle={titleText}
            initialBody={bodyText}
            isAnonymous={isAnon}
            isPublished={item.status === "published"}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}
