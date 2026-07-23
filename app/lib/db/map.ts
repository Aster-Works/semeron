/**
 * DB 行（snake_case, jsonb）→ アプリのドメイン型（camelCase）マッパ。
 * これにより Phase 1 のコンポーネント（ContentItem 等を受け取る）を無改造で再利用できる。
 */
import type {
  AppNotification,
  AuditLog,
  Church,
  ContentItem,
  Group,
  Localized,
  Membership,
} from "@/app/lib/demo/types";
import type { Database, Json, Tables } from "@/app/lib/database.types";

type ChurchRow = Tables<"churches">;
type MembershipRow = Tables<"memberships">;
type GroupRow = Tables<"groups">;
type ContentRow = Tables<"content_items"> | Tables<"content_feed">;
type NotificationOpsRow = Database["public"]["Functions"]["church_notification_ops"]["Returns"][number];
type NotificationRow = Tables<"notifications"> | NotificationOpsRow;
type AuditLogRow = Tables<"audit_logs">;

const DEFAULT_RETENTION_POLICY: Church["retentionPolicy"] = {
  reflectionVisibleDays: 30,
  notificationReadDays: 30,
  notificationUnreadDays: 90,
  adminNotificationDays: 180,
  reactionIdentityDays: 90,
  auditLogDays: 730,
};

const loc = (v: Json | null | undefined): Localized => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Localized;
};

const roleLabels = (v: Json | null | undefined): Record<string, Localized> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, Localized>;
};

const metadata = (v: Json | null | undefined): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
};

const positiveNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const retentionPolicy = (v: Json | null | undefined): Church["retentionPolicy"] => {
  const raw = metadata(v);
  return {
    reflectionVisibleDays: positiveNumber(
      raw.reflectionVisibleDays,
      DEFAULT_RETENTION_POLICY.reflectionVisibleDays,
      7,
      3650,
    ),
    notificationReadDays: positiveNumber(
      raw.notificationReadDays,
      DEFAULT_RETENTION_POLICY.notificationReadDays,
      7,
      3650,
    ),
    notificationUnreadDays: positiveNumber(
      raw.notificationUnreadDays,
      DEFAULT_RETENTION_POLICY.notificationUnreadDays,
      14,
      3650,
    ),
    adminNotificationDays: positiveNumber(
      raw.adminNotificationDays,
      DEFAULT_RETENTION_POLICY.adminNotificationDays,
      30,
      3650,
    ),
    reactionIdentityDays: positiveNumber(
      raw.reactionIdentityDays,
      DEFAULT_RETENTION_POLICY.reactionIdentityDays,
      7,
      3650,
    ),
    auditLogDays: positiveNumber(
      raw.auditLogDays,
      DEFAULT_RETENTION_POLICY.auditLogDays,
      180,
      3650,
    ),
  };
};

export function mapChurch(r: ChurchRow): Church {
  const inviteCodeExpiresAt = r.invite_code_expires_at ?? undefined;
  const row = r as ChurchRow & { retention_policy?: Json };
  return {
    id: r.id,
    slug: r.slug,
    name: loc(r.name),
    defaultLocale: r.default_locale as Church["defaultLocale"],
    contentLanguages: r.content_languages ?? [r.default_locale],
    timezone: r.timezone,
    morningNotificationTime: r.morning_notification_time?.slice(0, 5) ?? "",
    status: r.status as Church["status"],
    plan: r.plan as Church["plan"],
    inviteCode: r.invite_code,
    inviteCodeExpiresAt,
    inviteCodeRotatedAt: r.invite_code_rotated_at ?? undefined,
    inviteCodeExpired: inviteCodeExpiresAt ? Date.parse(inviteCodeExpiresAt) <= Date.now() : false,
    aiAddonEnabled: r.ai_addon_enabled ?? false,
    pastorAssistEnabled: r.pastor_assist_enabled ?? false,
    allowPrayerAi: r.allow_prayer_ai ?? false,
    retentionPolicy: retentionPolicy(row.retention_policy),
    roleLabels: roleLabels(r.role_labels),
  };
}

export function mapMembership(r: MembershipRow, roles: string[] = [], groupIds: string[] = []): Membership {
  return {
    id: r.id,
    churchId: r.church_id,
    userId: r.user_id ?? null,
    displayName: r.display_name,
    email: r.email ?? undefined,
    status: r.status as Membership["status"],
    roles: roles as Membership["roles"],
    groupIds,
    joinedAt: r.joined_at ?? undefined,
  };
}

export function mapGroup(r: GroupRow): Group {
  return {
    id: r.id,
    churchId: r.church_id,
    name: loc(r.name),
    description: r.description ? loc(r.description) : undefined,
    leaderMembershipId: r.leader_membership_id ?? undefined,
    status: r.status as Group["status"],
  };
}

export function mapContent(r: ContentRow): ContentItem {
  const meta = metadata(r.metadata);
  return {
    id: r.id ?? "",
    churchId: r.church_id ?? "",
    groupId: r.group_id ?? undefined,
    authorMembershipId: r.author_membership_id ?? undefined,
    type: r.type as ContentItem["type"],
    status: r.status as ContentItem["status"],
    visibility: r.visibility as ContentItem["visibility"],
    title: loc(r.title),
    body: loc(r.body),
    scriptureReference: r.scripture_reference ?? undefined,
    scriptureTranslation: r.scripture_translation ?? undefined,
    scriptureQuote: r.scripture_quote ? loc(r.scripture_quote) : undefined,
    copyrightNotice: r.copyright_notice ?? undefined,
    reflectionQuestion: r.reflection_question ? loc(r.reflection_question) : undefined,
    prayerGuide: r.prayer_guide ? loc(r.prayer_guide) : undefined,
    requestedVisibility: (r.requested_visibility ?? undefined) as ContentItem["requestedVisibility"],
    anonymous: r.anonymous ?? false,
    includesThirdParty: r.includes_third_party ?? false,
    pastorConsultRequested: meta.pastor_consult_requested === true,
    churchOfficial: meta.church_official === true,
    sensitiveFlags: (r.sensitive_flags ?? []) as ContentItem["sensitiveFlags"],
    prayerOutcome: (r.prayer_outcome ?? undefined) as ContentItem["prayerOutcome"],
    metadata: meta,
    scheduledAt: r.scheduled_at ?? undefined,
    publishedAt: r.published_at ?? undefined,
    expiresAt: r.expires_at ?? undefined,
    devotionDate: r.devotion_date ?? undefined,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  };
}

export function mapNotification(r: NotificationRow): AppNotification {
  const row = r as NotificationRow & {
    data?: Json;
    category?: string | null;
    archived_at?: string | null;
    muted_by_recipient?: boolean | null;
  };
  return {
    id: r.id,
    churchId: r.church_id,
    recipientMembershipId: "recipient_membership_id" in r ? r.recipient_membership_id ?? undefined : undefined,
    type: r.type as AppNotification["type"],
    channel: r.channel as AppNotification["channel"],
    title: loc(r.title),
    body: r.body ? loc(r.body) : undefined,
    data: metadata(row.data),
    category: (row.category ?? "general") as AppNotification["category"],
    status: r.status as AppNotification["status"],
    scheduledAt: r.scheduled_at ?? undefined,
    sentAt: r.sent_at ?? undefined,
    failureReason: r.failure_reason ?? undefined,
    createdAt: r.created_at,
    read: r.read ?? false,
    archivedAt: row.archived_at ?? undefined,
    mutedByRecipient: row.muted_by_recipient ?? false,
  };
}

export function mapAuditLog(r: AuditLogRow): AuditLog {
  return {
    id: r.id,
    churchId: r.church_id ?? "",
    actorMembershipId: r.actor_membership_id ?? undefined,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id ?? undefined,
    metadata: metadata(r.metadata),
    createdAt: r.created_at,
  };
}
