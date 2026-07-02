import { HeartHandshake, Plus } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getMyPrayerRequests, getPrayerFeed } from "@/app/lib/db/queries";
import { createT } from "@/app/lib/i18n";
import { PrayerCard } from "@/app/components/member/PrayerCard";
import { ButtonLink, EmptyState, SectionHeading } from "@/app/components/ui";

export default async function PrayersPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");

  const newHref = `/${locale}/church/${church.slug}/prayers/new`;
  const [feed, myRequests] = await Promise.all([
    getPrayerFeed(supabase, viewer, locale as "ja" | "en"),
    getMyPrayerRequests(supabase, viewer, locale as "ja" | "en"),
  ]);
  // 自分の承認待ちの投稿は published フィードに含まれないため、上部に別出しする
  const myPending = myRequests.filter(
    (vm) => vm.item.status !== "published",
  );

  return (
    <>
      <div className="space-y-4">
        <SectionHeading
          title={t("prayer.feedTitle")}
          description={t("prayer.feedSubtitle")}
          right={
            <ButtonLink href={newHref} size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              {t("prayer.new")}
            </ButtonLink>
          }
        />

        {myPending.length > 0 ? (
          <div className="space-y-3">
            {myPending.map((vm) => (
              <PrayerCard key={vm.item.id} vm={vm} church={church} locale={locale as "ja" | "en"} />
            ))}
          </div>
        ) : null}

        {feed.length === 0 && myPending.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title={t("prayer.empty")}
            action={
              <ButtonLink href={newHref} variant="secondary" size="sm">
                {t("prayer.new")}
              </ButtonLink>
            }
          />
        ) : (
          <div className="space-y-3">
            {feed.map((vm) => (
              <PrayerCard key={vm.item.id} vm={vm} church={church} locale={locale as "ja" | "en"} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
