import { Suspense } from "react";
import {
  BellOff,
  BookOpenText,
  CalendarClock,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getOpsDashboard, getTodayDashboard, getWeeklySummary } from "@/app/lib/db/queries";
import type { Visibility } from "@/app/lib/demo/types";
import { createT, localize } from "@/app/lib/i18n";
import { formatDateKey } from "@/app/lib/utils";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { resolveVisibilityLabels } from "@/app/lib/roleLabels";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  SectionHeading,
  Stat,
  StatusPill,
  VisibilityBadge,
} from "@/app/components/ui";

type Loc = "ja" | "en";

/**
 * 管理ダッシュボード。重い集計は3つの Suspense 島に分割してストリーミング:
 * 見出しは即時表示、各島は自分のクエリが済み次第流れ込む。
 * requireChurchContext は React cache() 済みなので島ごとに呼んでも実行は1回。
 */
export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { viewer } = await requireChurchContext(locale, churchSlug);
  if (!isChurchAdmin(viewer)) {
    return <AccessDenied locale={locale as Loc} church={viewer.church} />;
  }
  const church = viewer.church;
  const t = createT(locale as Loc);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={t("common.admin")}
        title={t("admin.dashboard")}
        description={localize(church.name, locale as Loc, church.defaultLocale)}
      />

      <Suspense fallback={<TodayFallback locale={locale as Loc} />}>
        <TodaySection locale={locale as Loc} churchSlug={churchSlug} />
      </Suspense>

      <Suspense fallback={<WeeklyFallback locale={locale as Loc} />}>
        <WeeklySection locale={locale as Loc} churchSlug={churchSlug} />
      </Suspense>

      <Suspense fallback={<OpsFallback locale={locale as Loc} />}>
        <OpsSection locale={locale as Loc} churchSlug={churchSlug} />
      </Suspense>
    </div>
  );
}

/* ================= スケルトン(fallback) ================= */

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-line bg-surface p-4">
      <div className="h-3 w-16 rounded bg-mist" />
      <div className="mt-2 h-7 w-10 rounded bg-mist" />
    </div>
  );
}

function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-line bg-surface p-5">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`h-4 rounded bg-mist ${i === 0 ? "w-3/5" : "mt-3 w-2/5"}`} />
      ))}
    </div>
  );
}

function TodayFallback({ locale }: { locale: Loc }) {
  const t = createT(locale);
  return (
    <section className="space-y-3" aria-busy>
      <SectionHeading title={t("admin.todayDevotion")} />
      <CardSkeleton />
    </section>
  );
}

function WeeklyFallback({ locale }: { locale: Loc }) {
  const t = createT(locale);
  return (
    <section className="space-y-3" aria-busy>
      <SectionHeading title={t("admin.weekly.title")} description={t("admin.weekly.subtitle")} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function OpsFallback({ locale }: { locale: Loc }) {
  const t = createT(locale);
  return (
    <div className="grid gap-8 lg:grid-cols-2" aria-busy>
      <section className="space-y-3">
        <SectionHeading title={t("admin.pendingPrayers")} />
        <CardSkeleton />
      </section>
      <section className="space-y-3">
        <SectionHeading title={t("admin.scheduledDevotions")} />
        <CardSkeleton lines={3} />
      </section>
    </div>
  );
}

/* ================= Suspense 島 ================= */

/** (1) 今日のデボーション + (2) 今日の集計 */
async function TodaySection({ locale, churchSlug }: { locale: Loc; churchSlug: string }) {
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale);
  const { todayDevotion, stats } = await getTodayDashboard(supabase, church);

  return (
    <>
      <section className="space-y-3">
        <SectionHeading title={t("admin.todayDevotion")} />
        <Card>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {todayDevotion ? (
              <>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookOpenText className="h-4 w-4 shrink-0 text-sage-ink" aria-hidden />
                    <StatusPill status="published" locale={locale} />
                    {todayDevotion.scriptureReference ? (
                      <span className="text-xs text-muted">
                        {todayDevotion.scriptureReference}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-base font-semibold text-ink text-balance-safe">
                    {localize(todayDevotion.title, locale, church.defaultLocale)}
                  </h3>
                </div>
                <ButtonLink
                  href={`/${locale}/admin/${church.slug}/devotions/${todayDevotion.id}`}
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
                    <StatusPill status="draft" locale={locale} />
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

      <section className="space-y-3">
        {/* プライバシー注記は常設Calloutではなく見出しの説明文に（毎回の視覚ノイズを削減） */}
        <SectionHeading title={t("admin.weekAggregate")} description={t("admin.noIndividualNote")} />
        {stats ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t("admin.readCount")} value={stats.readCount} icon={BookOpenText} />
            <Stat label={t("admin.prayedCount")} value={stats.prayedCount} icon={HeartHandshake} />
            <Stat
              label={t("admin.reflectionCount")}
              value={stats.reflectionCount}
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
    </>
  );
}

/** (2.5) 今週のあゆみ（過去7日・匿名集計） */
async function WeeklySection({ locale, churchSlug }: { locale: Loc; churchSlug: string }) {
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const t = createT(locale);
  const weekly = await getWeeklySummary(supabase, viewer.church.id);
  if (!weekly) return null;

  return (
    <section className="space-y-3">
      <SectionHeading title={t("admin.weekly.title")} description={t("admin.weekly.subtitle")} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat
          label={t("admin.weekly.devotions")}
          value={weekly.devotionsPublished}
          icon={BookOpenText}
        />
        <Stat label={t("admin.weekly.read")} value={weekly.readCount} icon={BookOpenText} />
        <Stat label={t("admin.weekly.prayed")} value={weekly.prayedCount} icon={HeartHandshake} />
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
        {/* 承認済み/承認待ちは「承認待ちの祈祷課題」カードと重複するため週間からは省く */}
        <Stat label={t("admin.weekly.newMembers")} value={weekly.newMembers} icon={ShieldCheck} />
      </div>
    </section>
  );
}

/** (3)-(6) 運用系グリッド（承認待ち/予約/公開範囲別/失敗通知） */
async function OpsSection({ locale, churchSlug }: { locale: Loc; churchSlug: string }) {
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale);
  const jaMode = locale === "ja";
  const visLabels = resolveVisibilityLabels(church, locale);
  const d = await getOpsDashboard(supabase, church.id);

  return (
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
                <p className="text-2xl font-semibold tabular-nums text-ink">{d.pendingCount}</p>
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
                        {dev.devotionDate ? formatDateKey(dev.devotionDate, locale) : "—"}
                      </span>
                      <span className="truncate text-sm text-ink text-balance-safe">
                        {localize(dev.title, locale, church.defaultLocale)}
                      </span>
                    </div>
                    <StatusPill status="scheduled" locale={locale} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      {/* (5) 公開範囲別の祈祷課題 — 公開中が1件以上あるときだけ出す（空カードの常設をやめる） */}
      {d.visibilityBreakdown.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading title={t("admin.visibilityBreakdown")} />
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-line">
                {d.visibilityBreakdown.map((row) => (
                  <li
                    key={row.visibility}
                    className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                  >
                    <VisibilityBadge visibility={row.visibility as Visibility} locale={locale} label={visLabels[row.visibility as Visibility]} />
                    <span className="text-sm font-semibold tabular-nums text-ink">{row.count}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {/* (6) 通知の失敗 — アラートなので失敗があるときだけ出す */}
      {d.failedNotifications.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading title={t("admin.notificationFailures")} />
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-line">
                {d.failedNotifications.map((n) => (
                  <li key={n.id} className="space-y-1 px-5 py-3.5 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-ink text-balance-safe">
                        {localize(n.title, locale, church.defaultLocale)}
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
            </CardBody>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
