import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createT, isLocale } from "@/app/lib/i18n";
import { getUser } from "@/app/lib/db/context";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { LoginForm } from "@/app/components/auth/LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getUser();
  if (user) redirect(`/${locale}`);
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
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-muted text-balance-safe">{t("app.tagline")}</p>
        </div>

        <LoginForm locale={locale} />

        <p className="mt-5 text-center text-sm text-muted">
          {locale === "ja" ? "教会がまだありませんか？ " : "No church yet? "}
          <a href={`/${locale}/onboarding`} className="font-medium text-sage-ink hover:underline">
            {locale === "ja" ? "教会を作る / 参加する" : "Create or join a church"}
          </a>
        </p>
      </main>
    </div>
  );
}
