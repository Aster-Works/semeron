import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireChurchContext } from "@/app/lib/db/context";
import { createT } from "@/app/lib/i18n";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { CsvImport } from "@/app/components/admin/CsvImport";
import { SectionHeading } from "@/app/components/ui";

export default async function ImportPrayersPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale: rawLocale, churchSlug } = await params;
  const locale = rawLocale as "ja" | "en";
  const { viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale);

  return (
    <AdminShell
      locale={locale}
      church={church}
      viewer={viewer}
      active="prayers"
      require="moderate"
    >
      <div className="space-y-5">
        <Link
          href={`/${locale}/admin/${church.slug}/prayer-requests`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("moderation.title")}
        </Link>
        <SectionHeading title={t("import.title")} description={t("import.subtitle")} />
        <CsvImport locale={locale} />
      </div>
    </AdminShell>
  );
}
