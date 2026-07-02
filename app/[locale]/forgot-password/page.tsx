import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createT, isLocale } from "@/app/lib/i18n";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { ForgotPasswordForm } from "@/app/components/auth/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
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
          {ja ? "パスワードの再設定" : "Reset your password"}
        </h1>
        <p className="mb-6 text-sm text-muted text-balance-safe">
          {ja
            ? "登録したメールアドレスに、再設定用のリンクを送ります。"
            : "We'll email you a link to set a new password."}
        </p>
        <ForgotPasswordForm locale={locale} />
        <p className="mt-6 text-center text-sm text-muted">
          <Link href={`/${locale}/login`} className="font-medium text-sage-ink hover:underline">
            {ja ? "ログインに戻る" : "Back to sign in"}
          </Link>
        </p>
      </main>
    </div>
  );
}
