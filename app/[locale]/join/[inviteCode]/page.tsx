import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createT, isLocale } from "@/app/lib/i18n";
import { getUser } from "@/app/lib/db/context";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { OnboardingForm } from "@/app/components/auth/OnboardingForm";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string; inviteCode: string }>;
}) {
  const { locale, inviteCode } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);
  const t = createT(locale);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2">
          <Image src="/icons/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
          <span className="text-sm font-semibold text-ink">{t("app.name")}</span>
        </span>
        <LocaleSwitcher />
      </header>
      <main id="main" className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-1 text-xl font-semibold text-ink">{t("join.title")}</h1>
        <p className="mb-6 text-sm text-muted text-balance-safe">{t("join.invitedBy")}</p>
        <OnboardingForm locale={locale} initialMode="join" initialCode={inviteCode} />
      </main>
    </div>
  );
}
