import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createT, isLocale } from "@/app/lib/i18n";
import { getUser, getMyChurches } from "@/app/lib/db/context";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { OnboardingForm } from "@/app/components/auth/OnboardingForm";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  // すでに教会に所属していれば自教会の「今日」へ（戻るボタン等で再訪した際に
  // 「まだ登録できていない」ように見える混乱と二重作成を防ぐ）。
  // 別教会への参加は招待リンク /join/[code] から直接できる。
  const { churches } = await getMyChurches();
  if (churches.length > 0) redirect(`/${locale}/church/${churches[0].slug}/today`);

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
        <h1 className="mb-1 text-xl font-semibold text-ink">
          {locale === "ja" ? "はじめに" : "Get started"}
        </h1>
        <p className="mb-6 text-sm text-muted text-balance-safe">
          {locale === "ja"
            ? "新しく教会を作るか、招待コードで参加します。"
            : "Create a new church, or join one with an invite code."}
        </p>
        <OnboardingForm locale={locale} />
      </main>
    </div>
  );
}
