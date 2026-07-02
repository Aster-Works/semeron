/**
 * 実データ読み取り層（サーバー側・RLS 適用）。
 * ContentItem 等のドメイン型 + 表示用の付随データ（作者名・リアクション数）を返す。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppNotification,
  Church,
  ContentItem,
  Group,
  Locale,
  Membership,
  ReactionType,
  Viewer,
} from "@/app/lib/demo/types";
import { toDateKey } from "@/app/lib/demo/selectors";
import { mapContent, mapGroup, mapMembership, mapNotification } from "./map";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PrayerVM {
  item: ContentItem;
  authorName: string;
  prayedCount: number;
  viewerPrayed: boolean;
  isMine: boolean;
}
export interface ReflectionVM {
  item: ContentItem;
  authorName: string;
  reactions: { type: ReactionType; count: number; active: boolean }[];
}

const anonName = (locale: Locale) => (locale === "ja" ? "匿名" : "Anonymous");

/** content_feed の行（author は RLS+マスク済み）を作者名解決付きで整える。 */
async function attachPrayerVMs(
  supabase: SupabaseClient,
  rows: any[],
  viewer: Viewer,
  locale: Locale,
): Promise<PrayerVM[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.author_membership_id).filter(Boolean))];

  // 作者名（マスクされていない分のみ）
  const nameById = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: mems } = await supabase
      .from("memberships")
      .select("id, display_name")
      .in("id", authorIds);
    (mems ?? []).forEach((m: any) => nameById.set(m.id, m.display_name));
  }

  // prayed 数 + 自分が祈ったか
  const { data: rxs } = await supabase
    .from("reactions")
    .select("content_item_id, membership_id, type")
    .in("content_item_id", ids)
    .eq("type", "prayed");
  const prayedCount = new Map<string, number>();
  const viewerPrayed = new Set<string>();
  (rxs ?? []).forEach((r: any) => {
    prayedCount.set(r.content_item_id, (prayedCount.get(r.content_item_id) ?? 0) + 1);
    if (viewer.membership && r.membership_id === viewer.membership.id) viewerPrayed.add(r.content_item_id);
  });

  return rows.map((r) => {
    const item = mapContent(r);
    const authorName = r.author_membership_id
      ? (nameById.get(r.author_membership_id) ?? anonName(locale))
      : anonName(locale);
    return {
      item,
      authorName,
      prayedCount: prayedCount.get(r.id) ?? 0,
      viewerPrayed: viewerPrayed.has(r.id),
      isMine: Boolean(viewer.membership && r.author_membership_id === viewer.membership.id),
    };
  });
}

/* ---------- Today ---------- */
export async function getTodayDevotion(
  supabase: SupabaseClient,
  church: Church,
  now: Date = new Date(),
): Promise<ContentItem | null> {
  const today = toDateKey(now, church.timezone);
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("church_id", church.id)
    .eq("type", "devotion")
    .eq("status", "published")
    .eq("devotion_date", today)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapContent(data) : null;
}

/** 本人の完了ログ（read/prayed 済みか）。 */
export async function getViewerCompletion(
  supabase: SupabaseClient,
  contentId: string,
): Promise<{ read: boolean; prayed: boolean }> {
  const { data } = await supabase
    .from("completion_logs")
    .select("completed_read_at, completed_prayed_at")
    .eq("content_item_id", contentId)
    .maybeSingle();
  return { read: Boolean(data?.completed_read_at), prayed: Boolean(data?.completed_prayed_at) };
}

/* ---------- Prayer feed / reflections ---------- */
export async function getPrayerFeed(
  supabase: SupabaseClient,
  viewer: Viewer,
  locale: Locale,
): Promise<PrayerVM[]> {
  // content_feed（RLS + 匿名マスク）から published の祈祷課題を取得
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "prayer_request")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return attachPrayerVMs(supabase, data ?? [], viewer, locale);
}

/** 自分の投稿（承認待ち含む）。今日ページ/フィードで「あなたの投稿」を出すため。 */
export async function getMyPrayerRequests(
  supabase: SupabaseClient,
  viewer: Viewer,
  locale: Locale,
): Promise<PrayerVM[]> {
  if (!viewer.membership) return [];
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "prayer_request")
    .eq("author_membership_id", viewer.membership.id)
    .order("created_at", { ascending: false });
  return attachPrayerVMs(supabase, data ?? [], viewer, locale);
}

export async function getReflections(
  supabase: SupabaseClient,
  viewer: Viewer,
  locale: Locale,
  limit = 10,
): Promise<ReflectionVM[]> {
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "reflection")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.author_membership_id).filter(Boolean))];
  const nameById = new Map<string, string>();
  if (authorIds.length) {
    const { data: mems } = await supabase.from("memberships").select("id, display_name").in("id", authorIds);
    (mems ?? []).forEach((m: any) => nameById.set(m.id, m.display_name));
  }
  const { data: rxs } = await supabase
    .from("reactions")
    .select("content_item_id, membership_id, type")
    .in("content_item_id", ids)
    .in("type", ["amen", "thanks"]);
  const count = new Map<string, number>();
  const mine = new Map<string, Set<string>>();
  (rxs ?? []).forEach((r: any) => {
    const k = `${r.content_item_id}:${r.type}`;
    count.set(k, (count.get(k) ?? 0) + 1);
    if (viewer.membership && r.membership_id === viewer.membership.id) {
      if (!mine.has(r.content_item_id)) mine.set(r.content_item_id, new Set());
      mine.get(r.content_item_id)!.add(r.type);
    }
  });
  return rows.map((r) => ({
    item: mapContent(r),
    authorName: r.author_membership_id ? (nameById.get(r.author_membership_id) ?? anonName(locale)) : anonName(locale),
    reactions: (["amen", "thanks"] as ReactionType[]).map((type) => ({
      type,
      count: count.get(`${r.id}:${type}`) ?? 0,
      active: mine.get(r.id)?.has(type) ?? false,
    })),
  }));
}

/* ---------- Groups ---------- */
export async function getMyGroups(supabase: SupabaseClient, viewer: Viewer): Promise<Group[]> {
  if (!viewer.membership || viewer.membership.groupIds.length === 0) return [];
  const { data } = await supabase.from("groups").select("*").in("id", viewer.membership.groupIds);
  return (data ?? []).map(mapGroup);
}
export async function getGroup(supabase: SupabaseClient, groupId: string): Promise<Group | null> {
  const { data } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  return data ? mapGroup(data) : null;
}
export async function getGroupMembers(supabase: SupabaseClient, groupId: string): Promise<Membership[]> {
  const { data } = await supabase
    .from("group_memberships")
    .select("membership:memberships(*)")
    .eq("group_id", groupId);
  return (data ?? []).map((r: any) => r.membership).filter(Boolean).map((m: any) => mapMembership(m));
}
export async function getGroupPrayers(
  supabase: SupabaseClient,
  viewer: Viewer,
  groupId: string,
  locale: Locale,
): Promise<PrayerVM[]> {
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("type", "prayer_request")
    .eq("status", "published")
    .eq("group_id", groupId)
    .order("published_at", { ascending: false });
  return attachPrayerVMs(supabase, data ?? [], viewer, locale);
}

/* ---------- Inbox ---------- */
export async function getInbox(supabase: SupabaseClient, viewer: Viewer): Promise<AppNotification[]> {
  if (!viewer.membership) return [];
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_membership_id", viewer.membership.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapNotification);
}
export async function getUnreadInboxCount(supabase: SupabaseClient, viewer: Viewer): Promise<number> {
  if (!viewer.membership) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_membership_id", viewer.membership.id)
    .eq("channel", "in_app")
    .eq("read", false);
  return count ?? 0;
}

/* ---------- Admin: moderation / devotions / members ---------- */
export async function getModerationQueue(
  supabase: SupabaseClient,
  viewer: Viewer,
): Promise<{ item: ContentItem; authorName: string }[]> {
  // モデレータは content_items 本体を直接読める（作者名も見える）
  const { data } = await supabase
    .from("content_items")
    .select("*, author:memberships!content_items_author_membership_id_fkey(display_name)")
    .eq("church_id", viewer.church.id)
    .eq("type", "prayer_request")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    item: mapContent(r),
    authorName: r.author?.display_name ?? (viewer.church.defaultLocale === "ja" ? "匿名" : "Anonymous"),
  }));
}

export async function getAllDevotions(supabase: SupabaseClient, churchId: string): Promise<ContentItem[]> {
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("church_id", churchId)
    .eq("type", "devotion")
    .order("devotion_date", { ascending: false });
  return (data ?? []).map(mapContent);
}
export async function getDevotion(supabase: SupabaseClient, id: string): Promise<ContentItem | null> {
  const { data } = await supabase.from("content_items").select("*").eq("id", id).eq("type", "devotion").maybeSingle();
  return data ? mapContent(data) : null;
}
export async function countReactions(
  supabase: SupabaseClient,
  contentId: string,
  type: ReactionType,
): Promise<number> {
  const { count } = await supabase
    .from("reactions")
    .select("id", { count: "exact", head: true })
    .eq("content_item_id", contentId)
    .eq("type", type);
  return count ?? 0;
}
export async function getDevotionCompletionCounts(
  supabase: SupabaseClient,
  contentId: string,
): Promise<{ read: number; prayed: number }> {
  const { data } = await supabase.rpc("devotion_completion_counts", { target_content: contentId });
  const row = Array.isArray(data) ? data[0] : data;
  return {
    read: Number(row?.read_count ?? 0),
    prayed: Number(row?.prayed_count ?? 0),
  };
}

export async function getMembers(supabase: SupabaseClient, churchId: string): Promise<Membership[]> {
  const { data } = await supabase
    .from("memberships")
    .select("*, membership_roles(role), group_memberships(group_id)")
    .eq("church_id", churchId)
    .order("joined_at", { ascending: true });
  return (data ?? []).map((m: any) =>
    mapMembership(
      m,
      (m.membership_roles ?? []).map((r: any) => r.role),
      (m.group_memberships ?? []).map((g: any) => g.group_id),
    ),
  );
}
export async function getChurchGroups(supabase: SupabaseClient, churchId: string): Promise<Group[]> {
  const { data } = await supabase.from("groups").select("*").eq("church_id", churchId);
  return (data ?? []).map(mapGroup);
}
export async function getChurchNotifications(supabase: SupabaseClient, churchId: string): Promise<AppNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapNotification);
}

/* ---------- Admin dashboard ---------- */
export interface DashboardData {
  todayDevotion: ContentItem | null;
  stats: { readCount: number; prayedCount: number; reflectionCount: number } | null;
  pendingCount: number;
  scheduled: ContentItem[];
  visibilityBreakdown: { visibility: string; count: number }[];
  failedNotifications: AppNotification[];
}
export async function getDashboardData(
  supabase: SupabaseClient,
  church: Church,
  now: Date = new Date(),
): Promise<DashboardData> {
  const todayDevotion = await getTodayDevotion(supabase, church, now);

  let stats: DashboardData["stats"] = null;
  if (todayDevotion) {
    const { data: counts } = await supabase.rpc("devotion_completion_counts", { target_content: todayDevotion.id });
    const row = Array.isArray(counts) ? counts[0] : counts;
    const { count: reflectionCount } = await supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("church_id", church.id)
      .eq("type", "reflection")
      .eq("status", "published");
    stats = {
      readCount: Number(row?.read_count ?? 0),
      prayedCount: Number(row?.prayed_count ?? 0),
      reflectionCount: reflectionCount ?? 0,
    };
  }

  const { count: pendingCount } = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("church_id", church.id)
    .eq("type", "prayer_request")
    .eq("status", "pending_review");

  const { data: scheduledRows } = await supabase
    .from("content_items")
    .select("*")
    .eq("church_id", church.id)
    .eq("type", "devotion")
    .eq("status", "scheduled")
    .order("devotion_date", { ascending: true });

  const { data: pubPrayers } = await supabase
    .from("content_items")
    .select("visibility")
    .eq("church_id", church.id)
    .eq("type", "prayer_request")
    .eq("status", "published");
  const vbMap = new Map<string, number>();
  (pubPrayers ?? []).forEach((r: any) => vbMap.set(r.visibility, (vbMap.get(r.visibility) ?? 0) + 1));

  const { data: failed } = await supabase
    .from("notifications")
    .select("*")
    .eq("church_id", church.id)
    .eq("status", "failed");

  return {
    todayDevotion,
    stats,
    pendingCount: pendingCount ?? 0,
    scheduled: (scheduledRows ?? []).map(mapContent),
    visibilityBreakdown: [...vbMap.entries()].map(([visibility, count]) => ({ visibility, count })),
    failedNotifications: (failed ?? []).map(mapNotification),
  };
}
