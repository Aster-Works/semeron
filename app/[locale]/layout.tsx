import { notFound } from "next/navigation";
import { LocaleProvider } from "@/app/lib/i18n/LocaleProvider";
import { isLocale, LOCALES } from "@/app/lib/i18n";
import { HtmlLang } from "@/app/components/HtmlLang";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <LocaleProvider locale={locale}>
      <HtmlLang locale={locale} />
      {children}
    </LocaleProvider>
  );
}
