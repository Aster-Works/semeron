import { BookOpen, Plus } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { countReactions, getAllDevotions } from "@/app/lib/db/queries";
import type { ContentItem } from "@/app/lib/demo/types";
import { createT, hasLocale, localize } from "@/app/lib/i18n";
import { formatDateKey } from "@/app/lib/utils";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { DeleteDevotionButton } from "@/app/components/admin/DeleteDevotionButton";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  SectionHeading,
  StatusPill,
} from "@/app/components/ui";

export default async function AdminDevotionsPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");

  const devotions = await getAllDevotions(supabase, church.id);

  // read/prayed 数は非同期。行ごとの N+1 を Promise.all でまとめて解決してから描画する。
  const counts = await Promise.all(
    devotions.map(async (dev) => ({
      id: dev.id,
      read: await countReactions(supabase, dev.id, "read"),
      prayed: await countReactions(supabase, dev.id, "prayed"),
    })),
  );
  const readById = new Map(counts.map((c) => [c.id, c.read]));
  const prayedById = new Map(counts.map((c) => [c.id, c.prayed]));

  const newHref = `/${locale}/admin/${church.slug}/devotions/new`;
  const editHref = (id: string) => `/${locale}/admin/${church.slug}/devotions/${id}`;

  function localeBadge(dev: ContentItem) {
    const ja = hasLocale(dev.title, "ja");
    const en = hasLocale(dev.title, "en");
    if (ja && en) return <Badge tone="sage">{t("devotions.localeBoth")}</Badge>;
    if (ja) return <Badge tone="slate">{t("devotions.localeJaOnly")}</Badge>;
    if (en) return <Badge tone="slate">{t("devotions.localeEnOnly")}</Badge>;
    return null;
  }

  function dateLabel(dev: ContentItem) {
    if (!dev.devotionDate) return "—";
    // devotionDate は日付のみ。タイムゾーンでずらさない（前日表示バグを防ぐ）。
    return formatDateKey(dev.devotionDate, locale as "ja" | "en");
  }

  return (
    <AdminShell locale={locale as "ja" | "en"} church={church} viewer={viewer} active="devotions">
      <div className="space-y-5">
        <SectionHeading
          title={t("devotions.title")}
          right={
            <ButtonLink href={newHref} size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              {t("devotions.new")}
            </ButtonLink>
          }
        />

        {devotions.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t("admin.notPublishedToday")}
            action={
              <ButtonLink href={newHref} variant="secondary" size="sm">
                <Plus className="h-4 w-4" aria-hidden />
                {t("devotions.new")}
              </ButtonLink>
            }
          />
        ) : (
          <>
            {/* --- Desktop / tablet: quiet table (sm+) --- */}
            <div className="hidden sm:block">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
                        <th scope="col" className="px-4 py-3 font-medium">
                          {t("devotions.colDate")}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          {t("devotions.colTitle")}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          {t("devotions.colLocale")}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          {t("devotions.colStatus")}
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">
                          {t("devotions.colRead")}
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">
                          {t("devotions.colPrayed")}
                        </th>
                        <th scope="col" className="px-4 py-3">
                          <span className="sr-only">{t("common.edit")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {devotions.map((dev) => (
                        <tr key={dev.id} className="align-top">
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">
                            {dateLabel(dev)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-ink text-balance-safe">
                              {localize(dev.title, locale as "ja" | "en", church.defaultLocale) || "—"}
                            </p>
                            {dev.scriptureReference ? (
                              <p className="mt-0.5 text-xs text-muted text-balance-safe">
                                {dev.scriptureReference}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{localeBadge(dev)}</td>
                          <td className="px-4 py-3">
                            <StatusPill status={dev.status} locale={locale as "ja" | "en"} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink-soft">
                            {readById.get(dev.id) ?? 0}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink-soft">
                            {prayedById.get(dev.id) ?? 0}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <ButtonLink href={editHref(dev.id)} variant="secondary" size="sm">
                                {t("common.edit")}
                              </ButtonLink>
                              <DeleteDevotionButton
                                churchId={church.id}
                                churchSlug={church.slug}
                                contentId={dev.id}
                                label={`${dateLabel(dev)} — ${localize(dev.title, locale as "ja" | "en", church.defaultLocale) || "—"}`}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* --- Mobile: stacked cards (< sm) --- */}
            <div className="space-y-3 sm:hidden">
              {devotions.map((dev) => (
                <Card key={dev.id}>
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs tabular-nums text-muted">{dateLabel(dev)}</p>
                        <p className="mt-0.5 font-medium text-ink text-balance-safe">
                          {localize(dev.title, locale as "ja" | "en", church.defaultLocale) || "—"}
                        </p>
                        {dev.scriptureReference ? (
                          <p className="mt-0.5 text-xs text-muted text-balance-safe">
                            {dev.scriptureReference}
                          </p>
                        ) : null}
                      </div>
                      <StatusPill status={dev.status} locale={locale as "ja" | "en"} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {localeBadge(dev)}
                      <span className="text-xs tabular-nums text-muted">
                        {t("devotions.colRead")} {readById.get(dev.id) ?? 0}
                      </span>
                      <span className="text-xs tabular-nums text-muted">
                        {t("devotions.colPrayed")} {prayedById.get(dev.id) ?? 0}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <ButtonLink href={editHref(dev.id)} variant="secondary" size="sm" fullWidth>
                        {t("common.edit")}
                      </ButtonLink>
                      <DeleteDevotionButton
                        churchId={church.id}
                        churchSlug={church.slug}
                        contentId={dev.id}
                        label={`${dateLabel(dev)} — ${localize(dev.title, locale as "ja" | "en", church.defaultLocale) || "—"}`}
                        fullWidth
                      />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
