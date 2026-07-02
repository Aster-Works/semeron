"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { menuSelectClass } from "@/app/components/menuSelectClass";
import { cn } from "@/app/lib/utils";

/**
 * ja/en 切替のドロップダウン。現在パスの [locale] セグメントだけを差し替え、
 * クエリは保持する。useSearchParams を使うため Suspense 境界で包む
 * （静的プリレンダされる login/join でも安全なように）。
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
  const router = useRouter();

  const go = (target: string) => {
    if (target === locale) return;
    const parts = pathname.split("/");
    parts[1] = target; // ['', 'ja', ...]
    const qs = sp.toString();
    router.push(parts.join("/") + (qs ? `?${qs}` : ""));
  };

  return (
    <select
      value={locale}
      onChange={(e) => go(e.target.value as Locale)}
      aria-label="Language"
      className={cn(menuSelectClass, className)}
    >
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  );
}

function LocaleSwitcherFallback({ className }: { className?: string }) {
  const { locale } = useLocale();
  return (
    <select value={locale} disabled aria-label="Language" className={cn(menuSelectClass, className)}>
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  );
}
