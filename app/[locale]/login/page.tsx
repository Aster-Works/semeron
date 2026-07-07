import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { BookOpenText, HeartHandshake, MessageCircleHeart, type LucideIcon } from "lucide-react";
import { createT, isLocale, type MessageId } from "@/app/lib/i18n";
import { getUser } from "@/app/lib/db/context";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { LoginForm } from "@/app/components/auth/LoginForm";

/**
 * ログイン画面 = ミニLP。初めて訪れた人（招待リンク以外の来訪・求道者含む）が
 * 「これは何のアプリか」を一目で掴めるよう、コア体験（みことば→祈り→応答）を添える。
 * モバイルはタイトル→フォーム→特徴の順（ログイン動線を最優先）。
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { next } = await searchParams;
  const nextPath = safeNext(next, locale);
  const user = await getUser();
  if (user) redirect(nextPath);
  const t = createT(locale);

  const features: { icon: LucideIcon; title: MessageId; desc: MessageId }[] = [
    { icon: BookOpenText, title: "login.lp.f1t", desc: "login.lp.f1d" },
    { icon: HeartHandshake, title: "login.lp.f2t", desc: "login.lp.f2d" },
    { icon: MessageCircleHeart, title: "login.lp.f3t", desc: "login.lp.f3d" },
  ];

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2">
          <Image src="/icons/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
          <span className="text-sm font-semibold text-ink">{t("app.name")}</span>
        </span>
        <LocaleSwitcher />
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 lg:pt-12">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
          {/* ヒーロー（何のアプリかを一文で） */}
          <section className="space-y-4 lg:col-start-1 lg:row-start-1">
            <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">
              {t("login.lp.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold leading-snug text-ink text-balance-safe sm:text-3xl lg:text-4xl">
              {t("app.tagline")}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-ink-soft text-balance-safe sm:text-base">
              {t("login.lp.lead")}
            </p>
          </section>

          {/* ログインフォーム（モバイルではヒーロー直下＝動線最優先） */}
          <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h2 className="mb-3 text-base font-semibold text-ink">{t("login.title")}</h2>
            <LoginForm locale={locale} nextPath={nextPath} />
            <p className="mt-5 text-center text-sm text-muted">
              {locale === "ja" ? "教会がまだありませんか？ " : "No church yet? "}
              <a href={`/${locale}/onboarding`} className="font-medium text-sage-ink hover:underline">
                {locale === "ja" ? "教会を作る / 参加する" : "Create or join a church"}
              </a>
            </p>
          </section>

          {/* アプリ概要（コア体験の3ステップ + 静けさの約束） */}
          <section className="space-y-6 lg:col-start-1 lg:row-start-2">
            <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
              {features.map(({ icon: Icon, title, desc }, i) => (
                <li
                  key={title}
                  className="flex gap-3 rounded-2xl border border-line bg-surface p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-sage-ink">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">
                      <span className="mr-1.5 text-xs font-medium tabular-nums text-muted">{i + 1}.</span>
                      {t(title)}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted text-balance-safe sm:text-sm">
                      {t(desc)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs leading-relaxed text-muted text-balance-safe sm:text-sm">
              {t("login.lp.quiet")}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function safeNext(raw: string | undefined, locale: "ja" | "en"): string {
  if (!raw) return `/${locale}`;
  if (!raw.startsWith("/")) return `/${locale}`;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return `/${locale}`;
  return raw;
}
