import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createT, isLocale } from "@/app/lib/i18n";
import { getUser } from "@/app/lib/db/context";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { ResetPasswordForm } from "@/app/components/auth/ResetPasswordForm";

/** リカバリーリンク（/auth/callback 経由）から開く新パスワード設定ページ。 */
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // リカバリーセッションが無ければやり直し（リンク期限切れ等）
  const user = await getUser();
  if (!user) redirect(`/${locale}/forgot-password`);
  const t = createT(locale);
  const ja = locale === "ja";

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
          {ja ? "新しいパスワードを設定" : "Set a new password"}
        </h1>
        <p className="mb-6 text-sm text-muted text-balance-safe">
          {ja
            ? "このアカウントの新しいパスワードを入力してください。"
            : "Enter a new password for your account."}
        </p>
        <ResetPasswordForm locale={locale} />
      </main>
    </div>
  );
}
