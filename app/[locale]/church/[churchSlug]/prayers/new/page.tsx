import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireChurchContext } from "@/app/lib/db/context";
import { getMyGroups } from "@/app/lib/db/queries";
import { createT } from "@/app/lib/i18n";
import { MemberShell } from "@/app/components/member/MemberShell";
import { PrayerRequestForm } from "@/app/components/member/PrayerRequestForm";

export default async function NewPrayerPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");
  const groups = await getMyGroups(supabase, viewer);

  return (
    <MemberShell locale={locale as "ja" | "en"} church={church} viewer={viewer} active="prayer">
      <div className="space-y-4">
        <Link
          href={`/${locale}/church/${church.slug}/prayers`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("prayer.feedTitle")}
        </Link>
        <h1 className="text-xl font-semibold text-ink">{t("prayerForm.title")}</h1>
        <PrayerRequestForm
          locale={locale as "ja" | "en"}
          churchId={church.id}
          churchSlug={church.slug}
          churchDefaultLocale={church.defaultLocale}
          groups={groups}
        />
      </div>
    </MemberShell>
  );
}
