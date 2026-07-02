import {
  BellOff,
  BookOpenText,
  CalendarClock,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getDashboardData, getWeeklySummary } from "@/app/lib/db/queries";
import type { Visibility } from "@/app/lib/demo/types";
import { createT, localize } from "@/app/lib/i18n";
import { formatDateKey } from "@/app/lib/utils";
import { AdminShell } from "@/app/components/admin/AdminShell";
import {
  Badge,
  ButtonLink,
  Callout,
  Card,
  CardBody,
  EmptyState,
  SectionHeading,
  Stat,
  StatusPill,
  VisibilityBadge,
} from "@/app/components/ui";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");
  const jaMode = locale === "ja";

  const [d, weekly] = await Promise.all([
    getDashboardData(supabase, church),
    getWeeklySummary(supabase, church.id),
  ]);

  return (
    <AdminShell
      locale={locale as "ja" | "en"}
      church={church}
      viewer={viewer}
      active="dashboard"
    >
      <div className="space-y-8">
        <SectionHeading
          eyebrow={t("common.admin")}
          title={t("admin.dashboard")}
          description={localize(church.name, locale as "ja" | "en", church.defaultLocale)}
        />

        {/* (1) 今日のデボーション */}
        <section className="space-y-3">
          <SectionHeading title={t("admin.todayDevotion")} />
          <Card>
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {d.todayDevotion ? (
                <>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookOpenText className="h-4 w-4 shrink-0 text-sage-ink" aria-hidden />
                      <StatusPill status="published" locale={locale as "ja" | "en"} />
                      {d.todayDevotion.scriptureReference ? (
                        <span className="text-xs text-muted">
                          {d.todayDevotion.scriptureReference}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-base font-semibold text-ink text-balance-safe">
                      {localize(d.todayDevotion.title, locale as "ja" | "en", church.defaultLocale)}
                    </h3>
                  </div>
                  <ButtonLink
                    href={`/${locale}/admin/${church.slug}/devotions/${d.todayDevotion.id}`}
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                  >
                    {t("admin.openEditor")}
                  </ButtonLink>
                </>
              ) : (
                <>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <BookOpenText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <StatusPill status="draft" locale={locale as "ja" | "en"} />
                    </div>
                    <p className="text-sm text-ink-soft text-balance-safe">
                      {t("admin.notPublishedToday")}
                    </p>
                  </div>
                  <ButtonLink
                    href={`/${locale}/admin/${church.slug}/devotions/new`}
                    size="sm"
                    className="shrink-0"
                  >
                    {t("admin.openEditor")}
                  </ButtonLink>
                </>
              )}
            </CardBody>
          </Card>
        </section>

        {/* (2) 今週の匿名集計 */}
        <section className="space-y-3">
          <SectionHeading title={t("admin.weekAggregate")} />
          <Callout tone="sage" icon={ShieldCheck}>
            {t("admin.noIndividualNote")}
          </Callout>
          {d.stats ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label={t("admin.readCount")} value={d.stats.readCount} icon={BookOpenText} />
              <Stat
                label={t("admin.prayedCount")}
                value={d.stats.prayedCount}
                icon={HeartHandshake}
              />
              <Stat
                label={t("admin.reflectionCount")}
                value={d.stats.reflectionCount}
                icon={ShieldCheck}
              />
            </div>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-muted text-balance-safe">
                  {t("admin.notPublishedToday")}
                </p>
              </CardBody>
            </Card>
          )}
        </section>

        {/* (2.5) 今週のあゆみ（過去7日・匿名集計。Roadmap Phase 3 週次サマリー） */}
        {weekly ? (
          <section className="space-y-3">
            <SectionHeading
              title={t("admin.weekly.title")}
              description={t("admin.weekly.subtitle")}
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label={t("admin.weekly.devotions")}
                value={weekly.devotionsPublished}
                icon={BookOpenText}
              />
              <Stat label={t("admin.weekly.read")} value={weekly.readCount} icon={BookOpenText} />
              <Stat
                label={t("admin.weekly.prayed")}
                value={weekly.prayedCount}
                icon={HeartHandshake}
              />
              <Stat
                label={t("admin.weekly.reflections")}
                value={weekly.reflectionCount}
                icon={ShieldCheck}
              />
              <Stat
                label={t("admin.weekly.newPrayers")}
                value={weekly.prayersSubmitted}
                icon={HeartHandshake}
              />
              <Stat
                label={t("admin.weekly.approved")}
                value={weekly.prayersApproved}
                icon={ShieldCheck}
              />
              <Stat
                label={t("admin.weekly.pending")}
                value={weekly.prayersPending}
                icon={CalendarClock}
              />
              <Stat
                label={t("admin.weekly.newMembers")}
                value={weekly.newMembers}
                icon={ShieldCheck}
              />
            </div>
          </section>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* (3) 承認待ちの祈祷課題 */}
          <section className="space-y-3">
            <SectionHeading title={t("admin.pendingPrayers")} />
            <Card>
              <CardBody className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                    <HeartHandshake className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-ink">
                      {d.pendingCount}
                    </p>
                    <p className="text-xs text-muted">
                      {jaMode ? "承認待ち" : "waiting for review"}
                    </p>
                  </div>
                </div>
                <ButtonLink
                  href={`/${locale}/admin/${church.slug}/prayer-requests`}
                  variant={d.pendingCount > 0 ? "primary" : "secondary"}
                  size="sm"
                  className="shrink-0"
                >
                  {t("admin.reviewNow")}
                </ButtonLink>
              </CardBody>
            </Card>
          </section>

          {/* (4) 予約済みデボーション */}
          <section className="space-y-3">
            <SectionHeading title={t("admin.scheduledDevotions")} />
            <Card>
              <CardBody className="p-0">
                {d.scheduled.length === 0 ? (
                  <div className="p-5 sm:p-6">
                    <EmptyState
                      icon={CalendarClock}
                      title={jaMode ? "予約済みのデボーションはありません。" : "No scheduled devotions."}
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {d.scheduled.map((dev) => (
                      <li
                        key={dev.id}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                      >
                        <div className="flex min-w-0 items-baseline gap-3">
                          <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-sage-ink">
                            {dev.devotionDate
                              ? formatDateKey(dev.devotionDate, locale as "ja" | "en")
                              : "—"}
                          </span>
                          <span className="truncate text-sm text-ink text-balance-safe">
                            {localize(dev.title, locale as "ja" | "en", church.defaultLocale)}
                          </span>
                        </div>
                        <StatusPill
                          status="scheduled"
                          locale={locale as "ja" | "en"}
                          className="shrink-0"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>

          {/* (5) 公開範囲別の祈祷課題 */}
          <section className="space-y-3">
            <SectionHeading title={t("admin.visibilityBreakdown")} />
            <Card>
              <CardBody className="p-0">
                {d.visibilityBreakdown.length === 0 ? (
                  <div className="p-5 sm:p-6">
                    <EmptyState
                      icon={ShieldCheck}
                      title={jaMode ? "公開中の祈祷課題はありません。" : "No published prayer requests."}
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {d.visibilityBreakdown.map((row) => (
                      <li
                        key={row.visibility}
                        className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                      >
                        <VisibilityBadge
                          visibility={row.visibility as Visibility}
                          locale={locale as "ja" | "en"}
                        />
                        <span className="text-sm font-semibold tabular-nums text-ink">
                          {row.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>

          {/* (6) 通知の失敗 */}
          <section className="space-y-3">
            <SectionHeading title={t("admin.notificationFailures")} />
            <Card>
              <CardBody className="p-0">
                {d.failedNotifications.length === 0 ? (
                  <div className="p-5 sm:p-6">
                    <EmptyState
                      icon={BellOff}
                      title={jaMode ? "失敗した通知はありません。" : "No failed notifications."}
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {d.failedNotifications.map((n) => (
                      <li key={n.id} className="space-y-1 px-5 py-3.5 sm:px-6">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm text-ink text-balance-safe">
                            {localize(n.title, locale as "ja" | "en", church.defaultLocale)}
                          </span>
                          <Badge tone="rose" icon={BellOff} className="shrink-0">
                            {t("notifications.statusFailed")}
                          </Badge>
                        </div>
                        {n.failureReason ? (
                          <p className="text-xs text-muted text-balance-safe">{n.failureReason}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
