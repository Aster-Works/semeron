import type { Church, Locale, Role, Visibility } from "@/app/lib/demo/types";
import { createT, localize } from "@/app/lib/i18n";

/**
 * 役割の「呼び方」解決（方針A: 権限は固定・表示名のみ教会別カスタム）。
 * - churches.role_labels の該当言語 → 教会の主言語 → 標準ラベル(i18n) の順。
 * - 公開範囲ラベル(「牧師のみ」等)も役割名から合成し、リネームに追従させる。
 */

export const ALL_ROLES: Role[] = [
  "owner", "pastor", "elder", "staff", "prayer_team", "group_leader", "member", "guest",
];

type ChurchLabelSource = Pick<Church, "roleLabels" | "defaultLocale">;

/** 8ロールぶんの表示名を一括解決する（サーバー側で1回呼んで配る）。 */
export function resolveRoleLabels(
  church: ChurchLabelSource,
  locale: Locale,
): Record<Role, string> {
  const t = createT(locale);
  const out = {} as Record<Role, string>;
  for (const role of ALL_ROLES) {
    const custom = church.roleLabels?.[role];
    const v = custom ? localize(custom, locale, church.defaultLocale).trim() : "";
    out[role] = v || t(`role.${role}`);
  }
  return out;
}

/**
 * 公開範囲ラベル。役割名を含むもの(pastor_only/elders/prayer_team)は
 * カスタム呼称から合成し、それ以外は標準ラベルを使う。
 */
export function visibilityLabel(
  visibility: Visibility,
  roleLabels: Record<Role, string>,
  locale: Locale,
): string {
  const t = createT(locale);
  const ja = locale === "ja";
  switch (visibility) {
    case "pastor_only":
      return ja ? `${roleLabels.pastor}のみ` : `${roleLabels.pastor} only`;
    case "elders":
      return ja
        ? `${roleLabels.pastor}・${roleLabels.elder}のみ`
        : `${roleLabels.pastor} & ${roleLabels.elder}`;
    case "prayer_team":
      return ja ? `${roleLabels.prayer_team}のみ` : `${roleLabels.prayer_team} only`;
    default:
      return t(`visibility.${visibility}`);
  }
}

const ALL_VISIBILITIES: Visibility[] = [
  "pastor_only", "elders", "prayer_team", "group", "church", "anonymous_church",
];

/** 全公開範囲のラベル一括版（クライアントへ props で渡す用）。 */
export function resolveVisibilityLabels(
  church: ChurchLabelSource,
  locale: Locale,
): Record<Visibility, string> {
  const rl = resolveRoleLabels(church, locale);
  const out = {} as Record<Visibility, string>;
  for (const v of ALL_VISIBILITIES) out[v] = visibilityLabel(v, rl, locale);
  return out;
}

/** メッセージ中の {placeholder} を置換する軽量フォーマッタ。 */
export function fmt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}
