import { FileUp, HeartHandshake, ListChecks } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getModerationQueue } from "@/app/lib/db/queries";
import { createT } from "@/app/lib/i18n";
import { ModerationCard } from "@/app/components/admin/ModerationCard";
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

  const queue = await getModerationQueue(supabase, viewer, locale as "ja" | "en");

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

        {queue.length === 0 ? (
          <EmptyState icon={HeartHandshake} title={t("moderation.empty")} />
        ) : (
          <div className="space-y-4">
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
          </div>
        )}
      </div>
    </>
  );
}
