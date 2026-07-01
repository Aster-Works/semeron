"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES } from "@/app/lib/i18n";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { cn } from "@/app/lib/utils";

/**
 * ja/en 切替。現在パスの [locale] セグメントだけを差し替え、クエリは保持する。
 * useSearchParams を使うため、静的プリレンダされるページ(login/join)でも
 * 安全なよう Suspense 境界で包む。
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<LocaleSwitcherFallback className={className} />}>
      <LocaleSwitcherInner className={className} />
    </Suspense>
  );
}

function LocaleSwitcherInner({ className }: { className?: string }) {
  const { locale } = useLocale();
  const pathname = usePathname() || "/ja";
  const sp = useSearchParams();

  const hrefFor = (target: string) => {
    const parts = pathname.split("/");
    parts[1] = target; // ['', 'ja', ...]
    const qs = sp.toString();
    return parts.join("/") + (qs ? `?${qs}` : "");
  };

  return (
    <div className={wrapperClass(className)} role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={hrefFor(l)}
          aria-current={l === locale ? "true" : undefined}
          className={itemClass(l === locale)}
        >
          {l === "ja" ? "日本語" : "EN"}
        </Link>
      ))}
    </div>
  );
}

function LocaleSwitcherFallback({ className }: { className?: string }) {
  const { locale } = useLocale();
  return (
    <div className={wrapperClass(className)} role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <span key={l} className={itemClass(l === locale)}>
          {l === "ja" ? "日本語" : "EN"}
        </span>
      ))}
    </div>
  );
}

function wrapperClass(className?: string) {
  return cn(
    "inline-flex items-center rounded-full border border-line-strong bg-surface p-0.5 text-xs",
    className,
  );
}

function itemClass(active: boolean) {
  return cn(
    "rounded-full px-2.5 py-1 font-medium transition-colors",
    active ? "bg-ink text-paper" : "text-muted hover:text-ink",
  );
}
