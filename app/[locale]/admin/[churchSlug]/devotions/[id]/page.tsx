import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getDevotion } from "@/app/lib/db/queries";
import { createT } from "@/app/lib/i18n";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { DevotionForm } from "@/app/components/admin/DevotionForm";

export default async function AdminDevotionEditPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string; id: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  if (!isChurchAdmin(viewer)) {
    return <AccessDenied locale={locale as "ja" | "en"} church={viewer.church} />;
  }
  const church = viewer.church;
  const { id } = await params;

  const devotion = await getDevotion(supabase, id);
  if (!devotion) notFound();

  const t = createT(locale as "ja" | "en");

  return (
    <>
      <div className="space-y-5">
        <div className="space-y-2">
          <Link
            href={`/${locale}/admin/${church.slug}/devotions`}
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-semibold text-ink text-balance-safe">
            {t("editor.editTitle")}
          </h1>
        </div>

        <DevotionForm
          locale={locale as "ja" | "en"}
          churchId={church.id}
          churchSlug={church.slug}
          contentLanguages={church.contentLanguages}
          initial={devotion}
          assistEnabled={church.pastorAssistEnabled}
        />
      </div>
    </>
  );
}
