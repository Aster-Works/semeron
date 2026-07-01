/**
 * Semeron — 可視性・権限ロジック（Phase 1 の「RLS 相当」）
 *
 * 出典: 04_Data Model and Security_Aster Daily.md
 *   §4 Visibility Rules / §5 Status Rules / §10 Security Test Cases
 *
 * これは Phase 2 で Supabase RLS に置き換える予定の「安全設計の中核」。
 * Phase 1 のデモでも、フィード・キュー・ダッシュボードは必ずこの関数群を通して
 * フィルタする（=画面ごとに可視性を実装し直して事故る、を防ぐ）。
 *
 * 純関数（副作用なし）。ここが実装優先度 #1（プライバシー・可視性の正しさ）。
 */

import type {
  ContentItem,
  Membership,
  Role,
  Viewer,
  Visibility,
} from "./types";

/** 管理領域（Dashboard 等）にアクセスできるロール。 */
export const ADMIN_ROLES: Role[] = ["owner", "pastor", "elder", "staff"];

/** 祈祷課題を承認/却下し、モデレーションキューを見られるロール。 */
export const MODERATOR_ROLES: Role[] = ["owner", "pastor", "elder", "prayer_team"];

/** 各 visibility を「閲覧できるロール」（group / church 系は別途メンバーシップ判定）。 */
const VISIBILITY_ROLE_MAP: Record<Visibility, Role[] | "member" | "group"> = {
  pastor_only: ["owner", "pastor"],
  elders: ["owner", "pastor", "elder"],
  prayer_team: ["owner", "pastor", "elder", "prayer_team"],
  group: "group",
  church: "member",
  anonymous_church: "member",
};

function membershipHasRole(membership: Membership | null, roles: Role[]): boolean {
  if (!membership) return false;
  return membership.roles.some((r) => roles.includes(r));
}

/** アクティブな会員か（RLS の auth.uid() != null かつ membership.status = active に相当）。 */
export function isActiveMember(viewer: Viewer): boolean {
  const m = viewer.membership;
  if (!m) return false;
  // 教会分離: membership は必ず現在の教会のものであること。
  if (m.churchId !== viewer.church.id) return false;
  return m.status === "active";
}

export function hasRole(viewer: Viewer, roles: Role[]): boolean {
  if (!isActiveMember(viewer)) return false;
  return membershipHasRole(viewer.membership, roles);
}

/** 管理者（教会内の管理領域を見られる）。 */
export function isChurchAdmin(viewer: Viewer): boolean {
  return hasRole(viewer, ADMIN_ROLES);
}

/** 祈祷課題をモデレーションできる（承認・却下・キュー閲覧）。 */
export function canModerate(viewer: Viewer): boolean {
  return hasRole(viewer, MODERATOR_ROLES);
}

/** グループのメンバーか。 */
export function isGroupMember(viewer: Viewer, groupId?: string): boolean {
  if (!groupId || !isActiveMember(viewer)) return false;
  return viewer.membership!.groupIds.includes(groupId);
}

function isAuthor(viewer: Viewer, item: ContentItem): boolean {
  const m = viewer.membership;
  if (!m || !item.authorMembershipId) return false;
  return m.id === item.authorMembershipId;
}

/** published コンテンツに対して、visibility ルールだけを評価する（status は別途）。 */
function passesVisibilityRule(viewer: Viewer, item: ContentItem): boolean {
  const rule = VISIBILITY_ROLE_MAP[item.visibility];
  if (rule === "member") return isActiveMember(viewer);
  if (rule === "group") return isGroupMember(viewer, item.groupId) || isChurchAdmin(viewer);
  return hasRole(viewer, rule);
}

/**
 * 中心関数: この閲覧者はこのコンテンツを見られるか。
 * 04 §4/§5/§10 を反映。now は期限切れ判定用（デモは固定クロック）。
 */
export function canViewContent(
  viewer: Viewer,
  item: ContentItem,
  now: Date = new Date(),
): boolean {
  // 1) 教会分離（§10: Church A member cannot select Church B content）
  if (item.churchId !== viewer.church.id) return false;
  const m = viewer.membership;
  if (!m || m.churchId !== item.churchId) return false;

  // 2) 投稿者は自分の投稿を常に見られる（draft/rejected/archived 含む）
  if (isAuthor(viewer, item)) return true;

  // 3) それ以外はアクティブ会員であること
  if (!isActiveMember(viewer)) return false;

  // 4) status ゲート
  switch (item.status) {
    case "draft":
      // 作者/管理者のみ（作者は 2 で通過済み）
      return isChurchAdmin(viewer);
    case "scheduled":
      // 公開時刻まで管理者のみ
      return isChurchAdmin(viewer);
    case "pending_review":
      // 作者 + レビュアーのみ（§5/§10: 未承認の漏洩ゼロ）。
      // センシティブな未承認内容の事前露出を避け、レビュアー=canModerate に限定する。
      return canModerate(viewer);
    case "rejected":
      // 作者 + レビュアーのみ（通常会員には決して見せない）
      return canModerate(viewer);
    case "archived":
      // 既定は管理者のみ（作者は 2 で通過済み）
      return isChurchAdmin(viewer);
    case "published":
      break;
    default:
      return false;
  }

  // 5) published: 期限切れは会員リストから消える（管理者は監査のため見える）
  if (item.expiresAt && new Date(item.expiresAt).getTime() < now.getTime()) {
    if (!isChurchAdmin(viewer)) return false;
  }

  // 6) visibility ルール
  return passesVisibilityRule(viewer, item);
}

/** グループリーダーか（自グループの祈祷課題モデレーションを Phase 2 で許可する布石）。 */
export function isGroupLeaderOf(viewer: Viewer, groupId: string): boolean {
  return hasRole(viewer, ["group_leader"]) && isGroupMember(viewer, groupId);
}

/**
 * 投稿者名をこの閲覧者に表示してよいか。
 * anonymous_church / anonymous=true は一般会員に作者を隠す。管理者・作者本人には見せる。
 */
export function isAuthorVisibleTo(viewer: Viewer, item: ContentItem): boolean {
  const anonymous = item.visibility === "anonymous_church" || item.anonymous === true;
  if (!anonymous) return true;
  if (isAuthor(viewer, item)) return true;
  return isChurchAdmin(viewer) || canModerate(viewer);
}

/** 一覧向け: 閲覧者が見られるものだけに絞る。 */
export function visibleContentForViewer(
  items: ContentItem[],
  viewer: Viewer,
  now: Date = new Date(),
): ContentItem[] {
  return items.filter((item) => canViewContent(viewer, item, now));
}

/** モデレーション対象（pending_review の祈祷課題）を、権限のある人にだけ。 */
export function moderationQueueForViewer(
  items: ContentItem[],
  viewer: Viewer,
): ContentItem[] {
  if (!canModerate(viewer)) return [];
  return items.filter(
    (i) =>
      i.churchId === viewer.church.id &&
      i.type === "prayer_request" &&
      i.status === "pending_review",
  );
}
