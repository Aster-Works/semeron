/**
 * ルートの共通コンテキスト解決。全ページで同じ形に揃える。
 * - locale 検証
 * - churchSlug から Church 解決（無ければ notFound）
 * - ?as=<membershipId> でデモ視点を選択（教会分離は buildViewer が担保）
 */
import { notFound } from "next/navigation";
import { isLocale } from "@/app/lib/i18n";
import {
  buildViewer,
  defaultMemberPersonaId,
  getChurchBySlug,
  getMembershipsForChurch,
} from "./selectors";
import type { Church, Locale, Viewer } from "./types";

export type SearchParams = { [key: string]: string | string[] | undefined };

export interface PageContext {
  locale: Locale;
  church: Church;
  viewer: Viewer;
  personaId?: string;
}

function personaFrom(sp: SearchParams | undefined): string | undefined {
  const v = sp?.as;
  return typeof v === "string" ? v : undefined;
}

/** 会員ページ用。?as が無ければ代表的な一般会員視点。 */
export async function memberPageContext(
  paramsP: Promise<{ locale: string; churchSlug: string }>,
  searchParamsP?: Promise<SearchParams>,
): Promise<PageContext> {
  const { locale, churchSlug } = await paramsP;
  const sp = searchParamsP ? await searchParamsP : undefined;
  if (!isLocale(locale)) notFound();
  const church = getChurchBySlug(churchSlug);
  if (!church) notFound();
  // ?as 未指定時も既定ペルソナを明示的に確定し、DemoBar 表示と viewer を一致させる。
  const personaId = personaFrom(sp) ?? defaultMemberPersonaId(church.id);
  return { locale, church, personaId, viewer: buildViewer(church, personaId) };
}

/** 管理ページ用。?as が無ければ既定で牧師/オーナー視点にして開けるようにする。 */
export async function adminPageContext(
  paramsP: Promise<{ locale: string; churchSlug: string }>,
  searchParamsP?: Promise<SearchParams>,
): Promise<PageContext> {
  const { locale, churchSlug } = await paramsP;
  const sp = searchParamsP ? await searchParamsP : undefined;
  if (!isLocale(locale)) notFound();
  const church = getChurchBySlug(churchSlug);
  if (!church) notFound();
  let personaId = personaFrom(sp);
  if (!personaId) {
    const admin = getMembershipsForChurch(church.id).find(
      (m) => m.roles.includes("owner") || m.roles.includes("pastor"),
    );
    personaId = admin?.id;
  }
  return { locale, church, personaId, viewer: buildViewer(church, personaId) };
}
