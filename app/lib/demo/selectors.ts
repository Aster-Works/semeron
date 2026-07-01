/**
 * Semeron — デモ用セレクタ（データアクセス層）
 *
 * 画面は生配列を触らず、必ずここを通す。可視性は visibility.ts に一元化。
 * 将来 Supabase クエリ + RLS に置き換えても、画面側のインターフェイスは保てるようにする。
 */

import {
  auditLogs,
  churches,
  completionLogs,
  contentItems,
  DEMO_NOW,
  groups,
  memberships,
  moderationReviews,
  notifications,
  reactions,
} from "./data";
import type {
  AppNotification,
  AuditLog,
  Church,
  CompletionLog,
  ContentItem,
  ContentType,
  Group,
  Locale,
  Membership,
  ReactionType,
  Role,
  Viewer,
} from "./types";
import {
  canModerate,
  canViewContent,
  isAuthorVisibleTo,
  isChurchAdmin,
  moderationQueueForViewer,
  visibleContentForViewer,
} from "./visibility";

/* ---------- 基本 ---------- */
export function getChurchBySlug(slug: string): Church | undefined {
  return churches.find((c) => c.slug === slug);
}
export function getChurchById(id: string): Church | undefined {
  return churches.find((c) => c.id === id);
}
export function allChurches(): Church[] {
  return churches;
}
export function getMembership(id: string | undefined | null): Membership | undefined {
  if (!id) return undefined;
  return memberships.find((m) => m.id === id);
}
export function getMembershipsForChurch(churchId: string): Membership[] {
  return memberships.filter((m) => m.churchId === churchId);
}
export function getActiveMemberships(churchId: string): Membership[] {
  return getMembershipsForChurch(churchId).filter((m) => m.status === "active");
}
export function getGroupsForChurch(churchId: string): Group[] {
  return groups.filter((g) => g.churchId === churchId);
}
export function getGroup(id: string | undefined): Group | undefined {
  if (!id) return undefined;
  return groups.find((g) => g.id === id);
}
export function getGroupMembers(groupId: string): Membership[] {
  return memberships.filter((m) => m.groupIds.includes(groupId) && m.status === "active");
}
export function getGroupsForMembership(m: Membership | null): Group[] {
  if (!m) return [];
  return groups.filter((g) => m.groupIds.includes(g.id));
}

/* ---------- Viewer（デモの「〜の視点で見る」） ---------- */

/** ロールを短いラベルに（バッジ/ペルソナ表示用）。 */
export const ROLE_ORDER: Role[] = [
  "owner",
  "pastor",
  "elder",
  "staff",
  "prayer_team",
  "group_leader",
  "member",
  "guest",
];

export interface Persona {
  membershipId: string;
  displayName: string;
  roles: Role[];
}

/** 教会ごとの、切替可能なデモ視点。 */
export function demoPersonas(churchId: string): Persona[] {
  return getMembershipsForChurch(churchId)
    .filter((m) => m.status === "active")
    .map((m) => ({ membershipId: m.id, displayName: m.displayName, roles: m.roles }));
}

/** 既定の会員視点（?as 未指定時）。一般会員を優先し、DemoBar と viewer を一致させる。 */
export function defaultMemberPersonaId(churchId: string): string | undefined {
  const active = getMembershipsForChurch(churchId).filter((m) => m.status === "active");
  return (active.find((m) => m.roles.includes("member")) ?? active[0])?.id;
}

export function buildViewer(church: Church, membershipId?: string | null): Viewer {
  const membership = membershipId
    ? getMembership(membershipId) ?? null
    : // 既定は、その教会の代表的な一般会員視点で見せる
      getMembershipsForChurch(church.id).find((m) => m.roles.includes("member") && m.status === "active") ?? null;
  // 別教会の membership が渡ってきたら弾く（教会分離）
  if (membership && membership.churchId !== church.id) {
    return { church, membership: null };
  }
  return { church, membership };
}

/* ---------- デボーション ---------- */
export function getTodayDevotion(church: Church, now: Date = DEMO_NOW): ContentItem | null {
  const today = toDateKey(now, church.timezone);
  return (
    contentItems.find(
      (c) =>
        c.churchId === church.id &&
        c.type === "devotion" &&
        c.status === "published" &&
        c.devotionDate === today,
    ) ?? null
  );
}
export function getAllDevotions(churchId: string): ContentItem[] {
  return contentItems
    .filter((c) => c.churchId === churchId && c.type === "devotion")
    .sort((a, b) => (a.devotionDate ?? "").localeCompare(b.devotionDate ?? "") * -1);
}
export function getDevotion(id: string): ContentItem | undefined {
  return contentItems.find((c) => c.id === id && c.type === "devotion");
}
export function getScheduledDevotions(churchId: string): ContentItem[] {
  return getAllDevotions(churchId).filter((c) => c.status === "scheduled");
}

/* ---------- 祈祷課題フィード / 応答 / お知らせ ---------- */
function contentByType(churchId: string, type: ContentType): ContentItem[] {
  return contentItems.filter((c) => c.churchId === churchId && c.type === type);
}

/** 会員フィードの祈祷課題（可視性・期限をRLS相当ロジックで適用済み）。 */
export function getPrayerFeed(viewer: Viewer, now: Date = DEMO_NOW): ContentItem[] {
  const all = contentByType(viewer.church.id, "prayer_request");
  return visibleContentForViewer(all, viewer, now).sort(sortByRecency);
}

export function getReflections(viewer: Viewer, now: Date = DEMO_NOW): ContentItem[] {
  const all = contentByType(viewer.church.id, "reflection");
  return visibleContentForViewer(all, viewer, now).sort(sortByRecency);
}
export function getTestimonies(viewer: Viewer, now: Date = DEMO_NOW): ContentItem[] {
  const all = contentByType(viewer.church.id, "testimony");
  return visibleContentForViewer(all, viewer, now).sort(sortByRecency);
}
export function getAnnouncements(viewer: Viewer, now: Date = DEMO_NOW): ContentItem[] {
  const all = contentByType(viewer.church.id, "announcement");
  return visibleContentForViewer(all, viewer, now).sort(sortByRecency);
}

/** グループの祈祷課題（会員側グループ画面）。 */
export function getGroupPrayers(viewer: Viewer, groupId: string, now: Date = DEMO_NOW): ContentItem[] {
  return getPrayerFeed(viewer, now).filter((c) => c.groupId === groupId);
}

/* ---------- モデレーション ---------- */
export function getModerationQueue(viewer: Viewer): ContentItem[] {
  return moderationQueueForViewer(contentItems, viewer).sort(sortByRecency);
}
export function getModerationReviews(contentItemId: string): typeof moderationReviews {
  return moderationReviews.filter((r) => r.contentItemId === contentItemId);
}

/* ---------- リアクション / 完了ログ ---------- */
export function countReactions(contentItemId: string, type: ReactionType): number {
  return reactions.filter((r) => r.contentItemId === contentItemId && r.type === type).length;
}
export function getViewerReactions(viewer: Viewer, contentItemId: string): ReactionType[] {
  if (!viewer.membership) return [];
  return reactions
    .filter((r) => r.contentItemId === contentItemId && r.membershipId === viewer.membership!.id)
    .map((r) => r.type);
}
/** 完了ログは本人だけ（管理者にも生ログは見せない）。 */
export function getViewerCompletion(viewer: Viewer, contentItemId: string): CompletionLog | null {
  if (!viewer.membership) return null;
  return (
    completionLogs.find(
      (l) => l.contentItemId === contentItemId && l.membershipId === viewer.membership!.id,
    ) ?? null
  );
}

/* ---------- Inbox ---------- */
export function getInbox(viewer: Viewer): AppNotification[] {
  if (!viewer.membership) return [];
  return notifications
    .filter((n) => n.recipientMembershipId === viewer.membership!.id && n.channel === "in_app")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getUnreadInboxCount(viewer: Viewer): number {
  return getInbox(viewer).filter((n) => !n.read).length;
}

/* ---------- 作者名の表示（匿名を尊重） ---------- */
export function authorLabel(item: ContentItem, viewer: Viewer, locale: Locale): string {
  if (!isAuthorVisibleTo(viewer, item)) {
    return locale === "ja" ? "匿名" : "Anonymous";
  }
  const m = getMembership(item.authorMembershipId);
  return m?.displayName ?? (locale === "ja" ? "教会" : "Church");
}

/* ---------- 管理: 匿名集計（個人別は出さない） ---------- */
export interface DevotionStats {
  readCount: number;
  prayedCount: number;
  reflectionCount: number;
}
export function getTodayDevotionStats(church: Church, now: Date = DEMO_NOW): DevotionStats | null {
  const dev = getTodayDevotion(church, now);
  if (!dev) return null;
  return {
    readCount: countReactions(dev.id, "read"),
    prayedCount: countReactions(dev.id, "prayed"),
    reflectionCount: contentByType(church.id, "reflection").filter((r) => r.status === "published").length,
  };
}
export function getPendingModerationCount(churchId: string): number {
  return contentItems.filter(
    (c) => c.churchId === churchId && c.type === "prayer_request" && c.status === "pending_review",
  ).length;
}
/** 公開範囲別の祈祷課題件数（published のみ、匿名集計）。 */
export function getVisibilityBreakdown(churchId: string): { visibility: string; count: number }[] {
  const published = contentItems.filter(
    (c) => c.churchId === churchId && c.type === "prayer_request" && c.status === "published",
  );
  const map = new Map<string, number>();
  for (const c of published) map.set(c.visibility, (map.get(c.visibility) ?? 0) + 1);
  return [...map.entries()].map(([visibility, count]) => ({ visibility, count }));
}
export function getFailedNotifications(churchId: string): AppNotification[] {
  return notifications.filter((n) => n.churchId === churchId && n.status === "failed");
}
/** 管理: 教会の全通知（送信/失敗/待ち）。 */
export function getChurchNotifications(churchId: string): AppNotification[] {
  return notifications
    .filter((n) => n.churchId === churchId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getChurchByInviteCode(code: string): Church | undefined {
  return churches.find((c) => c.inviteCode.toLowerCase() === code.toLowerCase());
}
export function getAuditLogs(churchId: string): AuditLog[] {
  return auditLogs.filter((a) => a.churchId === churchId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------- Admin 権限のガード（デモ用の簡易チェック） ---------- */
export function viewerCanAdmin(viewer: Viewer): boolean {
  return isChurchAdmin(viewer);
}
export function viewerCanModerate(viewer: Viewer): boolean {
  return canModerate(viewer);
}
export function viewerCanView(viewer: Viewer, item: ContentItem, now: Date = DEMO_NOW): boolean {
  return canViewContent(viewer, item, now);
}

/* ---------- utils ---------- */
function sortByRecency(a: ContentItem, b: ContentItem): number {
  return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
}

/** タイムゾーンを考慮した "YYYY-MM-DD"。 */
export function toDateKey(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // en-CA -> YYYY-MM-DD
}
