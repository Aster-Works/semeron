/**
 * Semeron — ドメイン型（Phase 1 デモ用）
 *
 * 出典: 04_Data Model and Security_Aster Daily.md
 * Phase 1 では Supabase を使わず、この型に沿った決定論的デモデータで動かす。
 * 型自体は将来の DB スキーマ（content_items 一枚方式）にそのまま写せる形にしておく。
 */

/** UI アセットのロケール（アプリの画面言語）。ja/en のみ。 */
export type Locale = "ja" | "en";

/**
 * 多言語文字列（言語コード→本文）。
 * キーは ja/en に限らず、教会が配信する任意の言語コード（es, ko, …）を持てる。
 * 未翻訳は localize() が「指定言語→フォールバック→利用可能な最初の言語」で解決する。
 */
export type Localized = { [lang: string]: string | undefined };

/** ロール（04 §2）。権限は user_metadata ではなく membership_roles で判定する思想。 */
export type Role =
  | "owner"
  | "pastor"
  | "elder"
  | "staff"
  | "group_leader"
  | "prayer_team"
  | "member"
  | "guest";

/** コンテンツ種別（content_items.type）。 */
export type ContentType =
  | "devotion"
  | "prayer_request"
  | "reflection"
  | "testimony"
  | "announcement";

/** 状態（05 §5）。祈祷課題は初期状態 pending_review。 */
export type ContentStatus =
  | "draft"
  | "scheduled"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived";

/** 公開範囲（04 §4）。widest = church / anonymous_church。 */
export type Visibility =
  | "pastor_only"
  | "elders"
  | "prayer_team"
  | "group"
  | "church"
  | "anonymous_church";

/** 公開範囲の全値（狭い→広い順）。検証・UI 列挙に使う。 */
export const VISIBILITIES: readonly Visibility[] = [
  "pastor_only",
  "elders",
  "prayer_team",
  "group",
  "church",
  "anonymous_church",
];

export type ReactionType = "amen" | "prayed" | "thanks" | "read";

/** 祈祷課題のセンシティブ分類（08 AI Prompt Pack のフラグに対応）。 */
export type SensitiveFlag =
  | "health"
  | "mental_health"
  | "family_or_marriage"
  | "finances"
  | "minors"
  | "third_party_information"
  | "faith_struggle"
  | "legal_or_criminal"
  | "self_harm_or_immediate_danger"
  | "other";

export type SoftGateMode = "gentle" | "focused" | "off";

export type PlanTier = "free" | "small" | "standard" | "pro";

export interface Church {
  id: string;
  slug: string;
  name: Localized;
  /** UI の既定ロケール（ja/en）。 */
  defaultLocale: Locale;
  /**
   * この教会がコンテンツを配信する言語コードの一覧（カスタム可能）。
   * 先頭が主言語。既定は1言語。UI ロケール(ja/en)とは独立。
   */
  contentLanguages: string[];
  timezone: string;
  /** 朝のデボーション通知時刻（"HH:MM"）。 */
  morningNotificationTime: string;
  status: "active" | "suspended";
  softGateMode: SoftGateMode;
  plan: PlanTier;
  inviteCode: string;
  /** Pastor Assist（管理者限定AI補助）を有効にするか。既定 false（opt-in）。 */
  pastorAssistEnabled: boolean;
  /** 祈祷課題の本文を AI に送ることを許可するか。要配慮情報のため既定 false。 */
  allowPrayerAi: boolean;
}

export interface Membership {
  id: string;
  churchId: string;
  /** Supabase Auth user に対応（デモではダミー）。null = 招待済み未ログイン。 */
  userId: string | null;
  displayName: string;
  email?: string;
  status: "invited" | "active" | "inactive" | "removed";
  roles: Role[];
  groupIds: string[];
  joinedAt?: string;
}

export interface Group {
  id: string;
  churchId: string;
  name: Localized;
  description?: Localized;
  leaderMembershipId?: string;
  status: "active" | "archived";
}

/**
 * content_items（04 §3）。デボーション・祈祷課題・応答・証し・お知らせを共通基盤に置く。
 * 種別ごとに使うフィールドが異なる（devotion は reflection/prayerGuide/scripture、
 * prayer_request は requestedVisibility/anonymous/sensitiveFlags/expiresAt など）。
 */
export interface ContentItem {
  id: string;
  churchId: string;
  groupId?: string;
  authorMembershipId?: string;
  type: ContentType;
  status: ContentStatus;
  visibility: Visibility;

  title: Localized;
  body: Localized;

  /** 聖書箇所参照。本文は大量内蔵しない（09 Bible Text Policy）。 */
  scriptureReference?: string;
  scriptureTranslation?: string;
  scriptureQuote?: Localized;
  copyrightNotice?: string;

  /** devotion 専用 */
  reflectionQuestion?: Localized;
  prayerGuide?: Localized;

  /** prayer_request 専用 */
  requestedVisibility?: Visibility;
  anonymous?: boolean;
  includesThirdParty?: boolean;
  sensitiveFlags?: SensitiveFlag[];
  /** 祈祷課題の状態（回答済み/感謝報告） */
  prayerOutcome?: "open" | "answered" | "thanksgiving";

  scheduledAt?: string;
  publishedAt?: string;
  expiresAt?: string;

  /** デボーションが「今日の分」であるかを引くための論理日（"YYYY-MM-DD"）。 */
  devotionDate?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ModerationReview {
  id: string;
  contentItemId: string;
  churchId: string;
  reviewerMembershipId?: string;
  decision: "approved" | "rejected" | "needs_revision";
  note?: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  churchId: string;
  contentItemId: string;
  membershipId: string;
  type: ReactionType;
  createdAt: string;
}

export interface CompletionLog {
  id: string;
  churchId: string;
  contentItemId: string;
  membershipId: string;
  completedReadAt?: string;
  completedPrayedAt?: string;
}

export type NotificationType =
  | "daily_devotion_published"
  | "daily_devotion_reminder"
  | "prayer_request_submitted_to_moderators"
  | "prayer_request_approved"
  | "prayer_request_rejected"
  | "prayer_request_prayed"
  | "weekly_summary_to_admins";

export interface AppNotification {
  id: string;
  churchId: string;
  recipientMembershipId?: string;
  type: NotificationType;
  channel: "in_app" | "email" | "web_push";
  title: Localized;
  body?: Localized;
  status: "queued" | "sent" | "failed" | "skipped";
  scheduledAt?: string;
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
  read?: boolean;
}

export interface AuditLog {
  id: string;
  churchId: string;
  actorMembershipId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * 閲覧者コンテキスト。RLS の `auth.uid()` + active membership に相当。
 * Phase 1 では「デモとして誰の視点で見るか」を表す。null = 未ログイン相当。
 */
export interface Viewer {
  membership: Membership | null;
  church: Church;
}
