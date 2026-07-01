import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/app/lib/demo/types";

/** Tailwind クラス結合（衝突は後勝ち）。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** セマンティックなトーン（色のみに依存させず、必ずラベル/アイコンと併用）。 */
export type Tone =
  | "neutral"
  | "sage"
  | "cedar"
  | "gold"
  | "rose"
  | "slate";

const intlLocale: Record<Locale, string> = { ja: "ja-JP", en: "en-US" };

/** "2026年7月1日(火)" / "Tue, Jul 1, 2026"。 */
export function formatFullDate(iso: string, locale: Locale, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    year: "numeric",
    month: locale === "ja" ? "long" : "short",
    day: "numeric",
    weekday: "short",
    timeZone,
  }).format(d);
}

/**
 * "YYYY-MM-DD" のカレンダー日付を、タイムゾーンでずらさずに整形する。
 * devotionDate のような日付のみの値に使う（new Date("2026-07-01") は UTC 深夜となり、
 * UTCマイナス圏で前日にずれてしまうため）。
 */
export function formatDateKey(dateKey: string, locale: Locale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(intlLocale[locale], {
    month: locale === "ja" ? "numeric" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** "7/1" / "Jul 1"。 */
export function formatMonthDay(iso: string, locale: Locale, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    month: locale === "ja" ? "numeric" : "short",
    day: "numeric",
    timeZone,
  }).format(d);
}

/** "6:30" のような時刻。 */
export function formatTime(iso: string, locale: Locale, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

/** イニシャル（アバター用）。日本語は先頭1文字、英語は各語の頭文字。 */
export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (/[A-Za-z]/.test(trimmed[0])) {
    return trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  return trimmed[0];
}
