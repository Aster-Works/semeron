import Link from "next/link";
import { Lock } from "lucide-react";
import type { Church, Locale, Viewer } from "@/app/lib/demo/types";
import { canModerate, isChurchAdmin } from "@/app/lib/demo/visibility";
import { createT, localize } from "@/app/lib/i18n";
import { HeaderSettingsMenu } from "@/app/components/HeaderSettingsMenu";
import { ButtonLink } from "@/app/components/ui";
import { AdminNav, type AdminSection } from "./AdminNav";

/** 管理画面の外殻（デスクトップはサイドバー、モバイルは横ナビ）。実ユーザー版。 */
export function AdminShell({
  locale,
  church,
  viewer,
  active,
  require = "admin",
  children,
}: {
  locale: Locale;
  church: Church;
  viewer: Viewer;
  active: AdminSection;
  require?: "admin" | "moderate";
  children: React.ReactNode;
}) {
  const t = createT(locale);
  const allowed =
    require === "moderate" ? canModerate(viewer) || isChurchAdmin(viewer) : isChurchAdmin(viewer);

  const sidebar = (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sage-strong text-xs font-bold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-ink">Semeron</span>
        </div>
        <p className="mt-2 text-sm font-medium text-ink text-balance-safe">
          {localize(church.name, locale, church.defaultLocale)}
        </p>
        <p className="text-xs uppercase tracking-wide text-muted">{church.plan}</p>
      </div>
      <AdminNav locale={locale} churchSlug={church.slug} active={active} orientation="vertical" />
      <div className="border-t border-line pt-3">
        <Link
          href={`/${locale}/church/${church.slug}/today`}
          className="text-xs font-medium text-sage-ink hover:underline"
        >
          ← {t("adminNav.backToMember")}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <p className="truncate text-sm font-medium text-ink">
            {localize(church.name, locale, church.defaultLocale)}
          </p>
          <HeaderSettingsMenu locale={locale} churchSlug={church.slug} section="admin" canAdmin />
        </div>
      </header>

      <div className="mx-auto max-w-6xl gap-6 px-4 py-5 lg:flex">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-4">{sidebar}</div>
        </aside>

        <div className="mb-4 lg:hidden">
          <AdminNav locale={locale} churchSlug={church.slug} active={active} orientation="horizontal" />
        </div>

        <main id="main" className="min-w-0 flex-1">
          {allowed ? children : <AccessDenied locale={locale} church={church} />}
        </main>
      </div>
    </div>
  );
}

function AccessDenied({ locale, church }: { locale: Locale; church: Church }) {
  const jaMode = locale === "ja";
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-cedar-soft text-cedar-ink">
        <Lock className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-ink">
        {jaMode ? "この画面を見る権限がありません" : "You don't have access to this screen"}
      </h2>
      <p className="mt-2 text-sm text-muted text-balance-safe">
        {jaMode
          ? "管理画面は牧師・長老・スタッフなどの役割に限定されています。"
          : "The admin area is limited to roles like pastor, elder, and staff."}
      </p>
      <div className="mt-5">
        <ButtonLink href={`/${locale}/church/${church.slug}/today`} variant="secondary" size="sm">
          {jaMode ? "会員画面へ戻る" : "Back to member view"}
        </ButtonLink>
      </div>
    </div>
  );
}
