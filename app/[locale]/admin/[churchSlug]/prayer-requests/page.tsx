import { FileUp, HeartHandshake, ListChecks } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getModerationQueue, getReviewRequestedPrayers } from "@/app/lib/db/queries";
import { createT } from "@/app/lib/i18n";
import { formatMonthDay } from "@/app/lib/utils";
import { ModerationCard } from "@/app/components/admin/ModerationCard";
import { ReviewRequestedCard } from "@/app/components/admin/ReviewRequestedCard";
import { ButtonLink, EmptyState, SectionHeading } from "@/app/components/ui";
import { resolveVisibilityLabels } from "@/app/lib/roleLabels";

export default async function PrayerModerationPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");
  const visLabels = resolveVisibilityLabels(viewer.church, locale as "ja" | "en");

  const [queue, requested] = await Promise.all([
    getModerationQueue(supabase, viewer, locale as "ja" | "en"),
    getReviewRequestedPrayers(supabase, viewer, locale as "ja" | "en"),
  ]);

  return (
    <>
      <div className="space-y-5">
        <SectionHeading
          title={t("moderation.title")}
          description={
            locale === "ja"
              ? "承認待ちの祈祷課題です。公開範囲を見直し、投稿者の意図を尊重しながら祈りへつなぎましょう。"
              : "Prayer requests awaiting review. Revisit the visibility, honor each author's intent, and carry them into prayer."
          }
          right={
            <div className="flex flex-wrap items-center gap-2">
              {church.pastorAssistEnabled ? (
                <ButtonLink
                  href={`/${locale}/admin/${church.slug}/prayer-requests/weekly-list`}
                  variant="secondary"
                  size="sm"
                >
                  <ListChecks className="h-4 w-4" aria-hidden />
                  {t("prayerList.link")}
                </ButtonLink>
              ) : null}
              <ButtonLink
                href={`/${locale}/admin/${church.slug}/prayer-requests/import`}
                variant="secondary"
                size="sm"
              >
                <FileUp className="h-4 w-4" aria-hidden />
                {t("import.link")}
              </ButtonLink>
            </div>
          }
        />

        {/* 会員からの確認依頼（公開中の投稿）。承認待ちキューには出ないためここで扱う。 */}
        {requested.length > 0 ? (
          <section className="space-y-4">
            <SectionHeading
              title={t("moderation.requested.heading")}
              description={t("moderation.requested.note")}
            />
            {requested.map((q) => (
              <ReviewRequestedCard
                key={q.item.id}
                item={q.item}
                authorName={q.authorName}
                churchId={church.id}
                churchSlug={church.slug}
                locale={locale as "ja" | "en"}
                churchDefaultLocale={church.defaultLocale}
                visLabel={visLabels[q.item.visibility]}
                requestedAtLabel={
                  typeof q.item.metadata?.admin_review_requested_at === "string"
                    ? formatMonthDay(
                        q.item.metadata.admin_review_requested_at,
                        locale as "ja" | "en",
                        church.timezone,
                      )
                    : undefined
                }
              />
            ))}
          </section>
        ) : null}

        {queue.length === 0 ? (
          requested.length === 0 ? (
            <EmptyState icon={HeartHandshake} title={t("moderation.empty")} />
          ) : null
        ) : (
          <section className="space-y-4">
            {requested.length > 0 ? (
              <SectionHeading title={t("moderation.pendingHeading")} />
            ) : null}
            {queue.map((q) => (
              <ModerationCard
                visLabels={visLabels}
                key={q.item.id}
                item={q.item}
                authorName={q.authorName}
                churchSlug={church.slug}
                locale={locale as "ja" | "en"}
                churchDefaultLocale={church.defaultLocale}
                assistEnabled={church.pastorAssistEnabled}
                allowPrayerAi={church.allowPrayerAi}
              />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
