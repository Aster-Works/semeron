/**
 * i18n ヘルパー（サーバー/クライアント両用）。
 * - createT(locale): サーバーコンポーネントでも使える翻訳関数を返す
 * - localize(localized, locale): コンテンツの Localized を教会デフォルトへフォールバック
 */
import type { Locale, Localized } from "@/app/lib/demo/types";
import { messages, type MessageId } from "./messages";

export const LOCALES: Locale[] = ["ja", "en"];

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "ja" || v === "en";
}

export function otherLocale(l: Locale): Locale {
  return l === "ja" ? "en" : "ja";
}

export type TFunction = (id: MessageId) => string;

/** 翻訳関数。未定義キーは開発補助として id をそのまま返す。 */
export function createT(locale: Locale): TFunction {
  return (id: MessageId) => {
    const m = messages[id];
    if (!m) return id;
    return m[locale] || m[otherLocale(locale)] || id;
  };
}

/**
 * コンテンツの Localized を解決する。
 * 優先順: 指定言語 → フォールバック言語（教会の主言語など）→ 利用可能な最初の言語。
 * これにより、UI が ja/en でもコンテンツが es/ko 等でも必ず何かを表示できる。
 */
export function localize(
  value: Localized | undefined,
  locale: string,
  fallback: string = "ja",
): string {
  if (!value) return "";
  if (value[locale]) return value[locale]!;
  if (value[fallback]) return value[fallback]!;
  for (const k of Object.keys(value)) {
    if (value[k] && value[k]!.trim()) return value[k]!;
  }
  return "";
}

/** Localized に指定言語の中身があるか（言語ステータス表示用）。任意の言語コード可。 */
export function hasLocale(value: Localized | undefined, locale: string): boolean {
  return Boolean(value && value[locale] && value[locale]!.trim().length > 0);
}

export type { MessageId } from "./messages";
export { messages } from "./messages";
