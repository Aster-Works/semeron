/**
 * 実データ読み取り層（サーバー側・RLS 適用）。
 * ContentItem 等のドメイン型 + 表示用の付随データ（作者名・リアクション数）を返す。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tables } from "@/app/lib/database.types";
import type {
  AppNotification,
  AuditLog,
  Church,
  ContentItem,
  Group,
  Locale,
  Membership,
  ReactionType,
  Viewer,
} from "@/app/lib/demo/types";
import { toDateKey } from "@/app/lib/demo/selectors";
import { startOfDayIso } from "@/app/lib/db/action-helpers";
import { selectTodayPrayers } from "@/app/lib/prayers/today";
import { mapAuditLog, mapContent, mapGroup, mapMembership, mapNotification } from "./map";

type ContentFeedRow = Tables<"content_feed">;
type AuditLogRow = Tables<"audit_logs">;
type MembershipRow = Tables<"memberships">;
type GroupRow = Tables<"groups">;
type ReactionRow = Pick<Tables<"reactions">, "content_item_id" | "membership_id" | "type">;
type MembershipNameRow = Pick<Tables<"memberships">, "id" | "display_name">;
type MembershipWithJoins = MembershipRow & {
  membership_roles?: { role: string }[] | null;
  group_memberships?: { group_id: string }[] | null;
};
type GroupMembershipWithMember = {
  membership: MembershipRow | MembershipRow[] | null;
};

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const PRAYER_REACTIONS: ReactionType[] = ["prayed"];

/**
 * 祈祷フィードで「表示期限を過ぎていない」行だけに絞る PostgREST 条件。
 * 期限なし / 期限が未来 / 既に答えられた(証しは残す) の3条件のいずれか。
 * ※期限切れの open な課題がフィードに残り続けるバグの修正。
 */
function notExpiredOr(nowIso: string): string {
  return `expires_at.is.null,expires_at.gt.${nowIso},prayer_outcome.in.(answered,thanksgiving)`;
}
const REFLECTION_REACTIONS: ReactionType[] = ["amen", "thanks"];

export interface PrayerVM {
  item: ContentItem;
  authorName: string;
  prayedCount: number;
  viewerPrayed: boolean;
  isMine: boolean;
  reactions?: { type: ReactionType; count: number; active: boolean }[];
}
export interface ReflectionVM {
  item: ContentItem;
  authorName: string;
  isMine: boolean;
  reactions: { type: ReactionType; count: number; active: boolean }[];
}
export interface AuditLogVM {
  log: AuditLog;
  actorName: string | null;
}

const anonName = (locale: Locale) => (locale === "ja" ? "匿名" : "Anonymous");

function canIncludeGroupScopedRow(row: Pick<ContentFeedRow, "visibility" | "group_id" | "author_membership_id">, viewer: Viewer) {
  if (row.visibility !== "group") return true;
  if (!viewer.membership || !row.group_id) return false;
  return viewer.membership.groupIds.includes(row.group_id) || row.author_membership_id === viewer.membership.id;
}

/** content_feed の行（author は RLS+マスク済み）を作者名解決付きで整える。 */
async function attachPrayerVMs(
  supabase: SupabaseClient,
  rows: ContentFeedRow[],
  viewer: Viewer,
  locale: Locale,
): Promise<PrayerVM[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id).filter(isString);
  const authorIds = [...new Set(rows.map((r) => r.author_membership_id).filter(isString))];

  // 作者名（マスクされていない分のみ）
  const nameById = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: mems } = await supabase
      .from("memberships")
      .select("id, display_name")
      .in("id", authorIds);
    ((mems ?? []) as MembershipNameRow[]).forEach((m) => nameById.set(m.id, m.display_name));
  }

  // 「祈っています / アーメン / 感謝」の静かなリアクション。
  const { data: rxs } = await supabase
    .from("reactions")
    .select("content_item_id, membership_id, type")
    .in("content_item_id", ids)
    .in("type", PRAYER_REACTIONS);
  const reactionCount = new Map<string, number>();
  const viewerReactions = new Map<string, Set<ReactionType>>();
  ((rxs ?? []) as ReactionRow[]).forEach((r) => {
    const type = r.type as ReactionType;
    const k = `${r.content_item_id}:${type}`;
    reactionCount.set(k, (reactionCount.get(k) ?? 0) + 1);
    if (viewer.membership && r.membership_id === viewer.membership.id) {
      if (!viewerReactions.has(r.content_item_id)) viewerReactions.set(r.content_item_id, new Set());
      viewerReactions.get(r.content_item_id)!.add(type);
    }
  });

  return rows.map((r) => {
    const id = r.id ?? "";
    const item = mapContent(r);
    const authorName = r.author_membership_id
      ? (nameById.get(r.author_membership_id) ?? anonName(locale))
      : anonName(locale);
    const active = viewerReactions.get(id);
    const reactions = PRAYER_REACTIONS.map((type) => ({
      type,
      count: reactionCount.get(`${id}:${type}`) ?? 0,
      active: active?.has(type) ?? false,
    }));
    return {
      item,
      authorName,
      prayedCount: reactions.find((r) => r.type === "prayed")?.count ?? 0,
      viewerPrayed: active?.has("prayed") ?? false,
      isMine: Boolean(viewer.membership && r.author_membership_id === viewer.membership.id),
      reactions,
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
  // content_feed 経由（基底表 content_items の直接 select は作者列剥奪で不可）。
  const { data } = await supabase
    .from("content_feed")
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
  // content_feed（RLS + 匿名マスク）から published の祈祷課題を取得。
  // 表示期限を過ぎた open な課題は除外する（答えられた課題の証しは残す）。
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "prayer_request")
    .eq("status", "published")
    .or(notExpiredOr(new Date().toISOString()))
    .order("published_at", { ascending: false });
  const rows = ((data ?? []) as ContentFeedRow[]).filter((row) => canIncludeGroupScopedRow(row, viewer));
  return attachPrayerVMs(supabase, rows, viewer, locale);
}

export async function getTodayPrayerSet(
  supabase: SupabaseClient,
  viewer: Viewer,
  locale: Locale,
  now: Date = new Date(),
): Promise<PrayerVM[]> {
  const prayers = await getPrayerFeed(supabase, viewer, locale);
  return selectTodayPrayers(prayers, viewer, now);
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
  return attachPrayerVMs(supabase, (data ?? []) as ContentFeedRow[], viewer, locale);
}

export async function getReflections(
  supabase: SupabaseClient,
  viewer: Viewer,
  locale: Locale,
  limit = 10,
  devotionContentId?: string,
): Promise<ReflectionVM[]> {
  let query = supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "reflection")
    .eq("status", "published");
  if (devotionContentId) {
    query = query.eq("metadata->>devotion_content_id", devotionContentId);
  }
  const { data } = await query.order("published_at", { ascending: false }).limit(limit);
  const rows = (data ?? []) as ContentFeedRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id).filter(isString);
  const ownIds = new Set<string>();
  if (viewer.membership) {
    await Promise.all(
      ids.map(async (id) => {
        const { data: owns } = await supabase.rpc("owns_content", { content_id: id });
        if (owns) ownIds.add(id);
      }),
    );
  }
  const { data: rxs } = await supabase
    .from("reactions")
    .select("content_item_id, membership_id, type")
    .in("content_item_id", ids)
    .in("type", REFLECTION_REACTIONS);
  const count = new Map<string, number>();
  const mine = new Map<string, Set<string>>();
  ((rxs ?? []) as ReactionRow[]).forEach((r) => {
    const k = `${r.content_item_id}:${r.type}`;
    count.set(k, (count.get(k) ?? 0) + 1);
    if (viewer.membership && r.membership_id === viewer.membership.id) {
      if (!mine.has(r.content_item_id)) mine.set(r.content_item_id, new Set());
      mine.get(r.content_item_id)!.add(r.type);
    }
  });
  return rows.map((r) => {
    const id = r.id ?? "";
    return {
      item: mapContent(r),
      authorName: anonName(locale),
      isMine: ownIds.has(id),
      reactions: REFLECTION_REACTIONS.map((type) => ({
        type,
        count: count.get(`${id}:${type}`) ?? 0,
        active: mine.get(id)?.has(type) ?? false,
      })),
    };
  });
}

/* ---------- Groups ---------- */
export async function getMyGroups(supabase: SupabaseClient, viewer: Viewer): Promise<Group[]> {
  if (!viewer.membership || viewer.membership.groupIds.length === 0) return [];
  const { data } = await supabase.from("groups").select("*").in("id", viewer.membership.groupIds);
  return ((data ?? []) as GroupRow[]).map(mapGroup);
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
  return ((data ?? []) as GroupMembershipWithMember[])
    .map((r) => (Array.isArray(r.membership) ? r.membership[0] : r.membership))
    .filter((m): m is MembershipRow => m?.status === "active")
    .map((m) => mapMembership(m));
}
export async function getGroupPrayers(
  supabase: SupabaseClient,
  viewer: Viewer,
  groupId: string,
  locale: Locale,
): Promise<PrayerVM[]> {
  if (!viewer.membership?.groupIds.includes(groupId)) return [];
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "prayer_request")
    .eq("status", "published")
    .eq("group_id", groupId)
    .or(notExpiredOr(new Date().toISOString()))
    .order("published_at", { ascending: false });
  const rows = ((data ?? []) as ContentFeedRow[]).filter((row) => canIncludeGroupScopedRow(row, viewer));
  return attachPrayerVMs(supabase, rows, viewer, locale);
}

/* ---------- Inbox ---------- */
export async function getInbox(supabase: SupabaseClient, viewer: Viewer): Promise<AppNotification[]> {
  if (!viewer.membership) return [];
  // 未読は常に表示。既読は「当日分（教会TZの今日つくられたもの）」だけ表示し続ける。
  // ＝翌日以降は既読のものが静かに消える。未読は日付に関わらず残る。
  const tz = viewer.church.timezone;
  const todayStart = startOfDayIso(toDateKey(new Date(), tz), tz);
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_membership_id", viewer.membership.id)
    .eq("channel", "in_app")
    .is("archived_at", null)
    .eq("muted_by_recipient", false)
    .or(`read.eq.false,created_at.gte.${todayStart}`)
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
    .is("archived_at", null)
    .eq("muted_by_recipient", false)
    .eq("read", false);
  return count ?? 0;
}

/* ---------- Admin: moderation / devotions / members ---------- */
export async function getModerationQueue(
  supabase: SupabaseClient,
  viewer: Viewer,
  locale: Locale,
): Promise<{ item: ContentItem; authorName: string }[]> {
  // 完全匿名: content_feed 経由で読むことで、匿名投稿の作者はモデレーターにも
  // 伏せられる（author_membership_id が null になる）。非匿名のみ実名を解決する。
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "prayer_request")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });
  return attachAuthorNames(supabase, (data ?? []) as ContentFeedRow[], locale);
}

/**
 * 会員から「確認を依頼」された公開中の祈祷課題。
 * requestAdminReview が metadata.admin_review_requested を立てるが、公開済みは
 * 承認待ちキュー（pending_review）に出ないため、この一覧で管理者に見せる。
 */
export async function getReviewRequestedPrayers(
  supabase: SupabaseClient,
  viewer: Viewer,
  locale: Locale,
): Promise<{ item: ContentItem; authorName: string }[]> {
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", viewer.church.id)
    .eq("type", "prayer_request")
    .eq("status", "published")
    .eq("metadata->>admin_review_requested", "true")
    .order("created_at", { ascending: false });
  return attachAuthorNames(supabase, (data ?? []) as ContentFeedRow[], locale);
}

/** content_feed 行（匿名は author が null にマスク済み）に作者名を付ける。 */
async function attachAuthorNames(
  supabase: SupabaseClient,
  rows: ContentFeedRow[],
  locale: Locale,
): Promise<{ item: ContentItem; authorName: string }[]> {
  const authorIds = [...new Set(rows.map((r) => r.author_membership_id).filter(isString))];
  const nameById = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: mems } = await supabase
      .from("memberships")
      .select("id, display_name")
      .in("id", authorIds);
    ((mems ?? []) as MembershipNameRow[]).forEach((m) => nameById.set(m.id, m.display_name));
  }
  return rows.map((r) => ({
    item: mapContent(r),
    authorName: r.author_membership_id
      ? (nameById.get(r.author_membership_id) ?? anonName(locale))
      : anonName(locale),
  }));
}

export async function getAllDevotions(supabase: SupabaseClient, churchId: string): Promise<ContentItem[]> {
  const { data } = await supabase
    .from("content_feed")
    .select("*")
    .eq("church_id", churchId)
    .eq("type", "devotion")
    .order("devotion_date", { ascending: false });
  return ((data ?? []) as ContentFeedRow[]).map(mapContent);
}
export async function getDevotion(supabase: SupabaseClient, id: string): Promise<ContentItem | null> {
  const { data } = await supabase.from("content_feed").select("*").eq("id", id).eq("type", "devotion").maybeSingle();
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
  return ((data ?? []) as MembershipWithJoins[]).map((m) =>
    mapMembership(
      m,
      (m.membership_roles ?? []).map((r) => r.role),
      (m.group_memberships ?? []).map((g) => g.group_id),
    ),
  );
}
export async function getChurchGroups(supabase: SupabaseClient, churchId: string): Promise<Group[]> {
  const { data } = await supabase.from("groups").select("*").eq("church_id", churchId);
  return ((data ?? []) as GroupRow[]).map(mapGroup);
}
export async function getChurchNotifications(supabase: SupabaseClient, churchId: string): Promise<AppNotification[]> {
  // 受信者・content連結を含まない配信メタデータのみ（匿名解除の逆引きを封じる definer RPC）。
  const { data } = await supabase.rpc("church_notification_ops", { target_church: churchId });
  return (data ?? []).map(mapNotification);
}

export async function getAuditLogs(
  supabase: SupabaseClient,
  churchId: string,
  limit = 100,
): Promise<AuditLogVM[]> {
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as AuditLogRow[];
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actor_membership_id).filter(isString))];
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: mems } = await supabase
      .from("memberships")
      .select("id, display_name")
      .in("id", actorIds);
    ((mems ?? []) as MembershipNameRow[]).forEach((m) => nameById.set(m.id, m.display_name));
  }

  return rows.map((row) => {
    const log = mapAuditLog(row);
    return {
      log,
      actorName: log.actorMembershipId ? (nameById.get(log.actorMembershipId) ?? null) : null,
    };
  });
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
/** 今日のデボーション+当日集計。devotion取得後、集計2本は並列。 */
export async function getTodayDashboard(
  supabase: SupabaseClient,
  church: Church,
  now: Date = new Date(),
): Promise<{ todayDevotion: ContentItem | null; stats: DashboardData["stats"] }> {
  const todayDevotion = await getTodayDevotion(supabase, church, now);
  if (!todayDevotion) return { todayDevotion: null, stats: null };
  const [countsRes, reflRes] = await Promise.all([
    supabase.rpc("devotion_completion_counts", { target_content: todayDevotion.id }),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("church_id", church.id)
      .eq("type", "reflection")
      .eq("status", "published"),
  ]);
  const row = Array.isArray(countsRes.data) ? countsRes.data[0] : countsRes.data;
  return {
    todayDevotion,
    stats: {
      readCount: Number(row?.read_count ?? 0),
      prayedCount: Number(row?.prayed_count ?? 0),
      reflectionCount: reflRes.count ?? 0,
    },
  };
}

/** 運用系（承認待ち/予約/公開範囲別/失敗通知）。4クエリ並列。 */
export async function getOpsDashboard(
  supabase: SupabaseClient,
  churchId: string,
): Promise<Pick<DashboardData, "pendingCount" | "scheduled" | "visibilityBreakdown" | "failedNotifications">> {
  const [pendingRes, scheduledRes, pubRes, failedRes] = await Promise.all([
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("church_id", churchId)
      .eq("type", "prayer_request")
      .eq("status", "pending_review"),
    supabase
      .from("content_feed")
      .select("*")
      .eq("church_id", churchId)
      .eq("type", "devotion")
      .eq("status", "scheduled")
      .order("devotion_date", { ascending: true }),
    supabase
      .from("content_items")
      .select("visibility")
      .eq("church_id", churchId)
      .eq("type", "prayer_request")
      .eq("status", "published"),
    supabase.rpc("church_notification_ops", { target_church: churchId, p_only_failed: true }),
  ]);
  const vbMap = new Map<string, number>();
  ((pubRes.data ?? []) as Pick<ContentFeedRow, "visibility">[]).forEach((r) => {
    if (!r.visibility) return;
    vbMap.set(r.visibility, (vbMap.get(r.visibility) ?? 0) + 1);
  });
  return {
    pendingCount: pendingRes.count ?? 0,
    scheduled: ((scheduledRes.data ?? []) as ContentFeedRow[]).map(mapContent),
    visibilityBreakdown: [...vbMap.entries()].map(([visibility, count]) => ({ visibility, count })),
    failedNotifications: (failedRes.data ?? []).map(mapNotification),
  };
}

/* ---------- 管理者向け週次サマリー（Roadmap Phase 3・匿名集計のみ）---------- */
export interface WeeklySummary {
  devotionsPublished: number;
  readCount: number;
  prayedCount: number;
  reflectionCount: number;
  prayersSubmitted: number;
  prayersApproved: number;
  prayersPending: number;
  newMembers: number;
}

/** 過去7日の教会のあゆみ。weekly_summary RPC(definer, 管理者チェック内蔵)を1往復で。 */
export async function getWeeklySummary(
  supabase: SupabaseClient,
  churchId: string,
): Promise<WeeklySummary | null> {
  const { data, error } = await supabase.rpc("weekly_summary", { target_church: churchId });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    devotionsPublished: Number(row.devotions_published ?? 0),
    readCount: Number(row.read_count ?? 0),
    prayedCount: Number(row.prayed_count ?? 0),
    reflectionCount: Number(row.reflection_count ?? 0),
    prayersSubmitted: Number(row.prayers_submitted ?? 0),
    prayersApproved: Number(row.prayers_approved ?? 0),
    prayersPending: Number(row.prayers_pending ?? 0),
    newMembers: Number(row.new_members ?? 0),
  };
}
