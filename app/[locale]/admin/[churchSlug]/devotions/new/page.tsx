import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireChurchContext } from "@/app/lib/db/context";
import { createT } from "@/app/lib/i18n";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { DevotionForm } from "@/app/components/admin/DevotionForm";
import { resolveVisibilityLabels } from "@/app/lib/roleLabels";

export default async function NewDevotionPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { viewer } = await requireChurchContext(locale, churchSlug);
  if (!isChurchAdmin(viewer)) {
    return <AccessDenied locale={locale as "ja" | "en"} church={viewer.church} />;
  }
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");

  return (
    <>
      <div className="space-y-5">
        <Link
          href={`/${locale}/admin/${church.slug}/devotions`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("devotions.title")}
        </Link>
        <h1 className="text-xl font-semibold text-ink text-balance-safe">{t("editor.newTitle")}</h1>
        <DevotionForm
          visLabels={resolveVisibilityLabels(viewer.church, locale as "ja" | "en")}
          locale={locale as "ja" | "en"}
          churchId={church.id}
          churchSlug={church.slug}
          churchTimezone={church.timezone}
          contentLanguages={church.contentLanguages}
          assistEnabled={church.pastorAssistEnabled}
        />
      </div>
    </>
  );
}
