import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireChurchContext } from "@/app/lib/db/context";
import { createT } from "@/app/lib/i18n";
import { WeeklyPrayerListPanel } from "@/app/components/admin/WeeklyPrayerListPanel";
import { SectionHeading } from "@/app/components/ui";

/** 週次祈祷リスト生成（祈祷会・小グループ用）。Pastor Assist・モデレータ限定。 */
export default async function WeeklyPrayerListPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");

  return (
    <>
      <div className="space-y-5">
        <Link
          href={`/${locale}/admin/${church.slug}/prayer-requests`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("moderation.title")}
        </Link>
        <SectionHeading
          title={t("prayerList.title")}
          description={t("prayerList.subtitle")}
        />
        <WeeklyPrayerListPanel
          locale={locale as "ja" | "en"}
          churchSlug={church.slug}
          assistEnabled={church.pastorAssistEnabled}
          allowPrayerAi={church.allowPrayerAi}
        />
      </div>
    </>
  );
}
