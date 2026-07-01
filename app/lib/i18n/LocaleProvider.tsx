"use client";

/**
 * クライアント用ロケールコンテキスト。
 * URL の [locale] セグメントが正典。ここではその値を配って、
 * ロケール切替リンクやフォーム内の t() で使えるようにする。
 */
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/app/lib/demo/types";
import { createT, type TFunction } from "./index";

interface LocaleContextValue {
  locale: Locale;
  t: TFunction;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: createT(locale) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // プロバイダ外（保険）: 日本語で動かす
    return { locale: "ja", t: createT("ja") };
  }
  return ctx;
}
