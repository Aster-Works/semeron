/**
 * 祈祷課題 CSV 取り込みのマッピング＆検証。
 *
 * CSV 列（ヘッダ必須・順不同）:
 *   title            必須
 *   body             必須
 *   visibility       任意 (pastor_only|elders|prayer_team|group|church|anonymous_church) 既定=prayer_team
 *   author_name      任意
 *   anonymous        任意 (true/false/yes/no/1/0) 既定=false
 *   expires_at       任意 (YYYY-MM-DD)
 *   sensitive_flags  任意 (";" 区切り。health;family_or_marriage など)
 *
 * 取り込んだ課題は必ず pending_review（承認待ち）扱いにする想定。ここでは
 * 純粋な検証のみ行い、実際の保存は Phase 2（Supabase）で実装する。
 */
import type { SensitiveFlag, Visibility } from "./types";

const VISIBILITIES: Visibility[] = [
  "pastor_only",
  "elders",
  "prayer_team",
  "group",
  "church",
  "anonymous_church",
];

const FLAGS: SensitiveFlag[] = [
  "health",
  "mental_health",
  "family_or_marriage",
  "finances",
  "minors",
  "third_party_information",
  "faith_struggle",
  "legal_or_criminal",
  "self_harm_or_immediate_danger",
  "other",
];

/** 取り込みの既定公開範囲（安全側＝狭め）。承認時に牧師が調整する。 */
export const IMPORT_DEFAULT_VISIBILITY: Visibility = "prayer_team";

export interface ImportedPrayer {
  rowNumber: number;
  title: string;
  body: string;
  visibility: Visibility;
  visibilityWasDefaulted: boolean;
  authorName?: string;
  anonymous: boolean;
  expiresAt?: string;
  sensitiveFlags: SensitiveFlag[];
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

export interface ImportResult {
  items: ImportedPrayer[];
  errors: ImportRowError[];
  /** 必須列が欠けている等、CSV 全体の問題。 */
  fatal?: string;
}

function parseBool(v: string): boolean {
  return /^(true|yes|1|y)$/i.test(v.trim());
}

function parseVisibility(v: string): { visibility: Visibility; defaulted: boolean } {
  const t = v.trim().toLowerCase();
  if (!t) return { visibility: IMPORT_DEFAULT_VISIBILITY, defaulted: true };
  const found = VISIBILITIES.find((x) => x === t);
  return found ? { visibility: found, defaulted: false } : { visibility: IMPORT_DEFAULT_VISIBILITY, defaulted: true };
}

function parseFlags(v: string): SensitiveFlag[] {
  if (!v.trim()) return [];
  return v
    .split(/[;|]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (FLAGS.includes(s as SensitiveFlag) ? (s as SensitiveFlag) : "other"))
    .filter((f, i, arr) => arr.indexOf(f) === i);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ヘッダ付き CSV 行（オブジェクト配列）をマッピングして検証する。 */
export function mapPrayerRows(rows: Record<string, string>[], headers: string[]): ImportResult {
  if (rows.length === 0) {
    return { items: [], errors: [], fatal: "empty" };
  }
  if (!headers.includes("title") || !headers.includes("body")) {
    return { items: [], errors: [], fatal: "missing_columns" };
  }

  const items: ImportedPrayer[] = [];
  const errors: ImportRowError[] = [];

  rows.forEach((r, idx) => {
    const rowNumber = idx + 2; // 1=ヘッダ, データは2行目から
    const title = (r.title ?? "").trim();
    const body = (r.body ?? "").trim();
    if (!title || !body) {
      errors.push({
        rowNumber,
        message: !title && !body ? "title_body_required" : !title ? "title_required" : "body_required",
      });
      return;
    }
    const { visibility, defaulted } = parseVisibility(r.visibility ?? "");
    const expiresRaw = (r.expires_at ?? "").trim();
    const expiresAt = expiresRaw && DATE_RE.test(expiresRaw) ? expiresRaw : undefined;
    if (expiresRaw && !expiresAt) {
      errors.push({ rowNumber, message: "bad_date" });
    }

    items.push({
      rowNumber,
      title,
      body,
      visibility,
      visibilityWasDefaulted: defaulted,
      authorName: (r.author_name ?? "").trim() || undefined,
      anonymous: parseBool(r.anonymous ?? ""),
      expiresAt,
      sensitiveFlags: parseFlags(r.sensitive_flags ?? ""),
    });
  });

  return { items, errors };
}
