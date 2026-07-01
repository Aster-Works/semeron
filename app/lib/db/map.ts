/**
 * DB 行（snake_case, jsonb）→ アプリのドメイン型（camelCase）マッパ。
 * これにより Phase 1 のコンポーネント（ContentItem 等を受け取る）を無改造で再利用できる。
 */
import type {
  AppNotification,
  Church,
  ContentItem,
  Group,
  Localized,
  Membership,
} from "@/app/lib/demo/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const loc = (v: any): Localized => (v && typeof v === "object" ? (v as Localized) : {});

export function mapChurch(r: any): Church {
  return {
    id: r.id,
    slug: r.slug,
    name: loc(r.name),
    defaultLocale: r.default_locale,
    contentLanguages: r.content_languages ?? [r.default_locale],
    timezone: r.timezone,
    morningNotificationTime: r.morning_notification_time ?? "",
    status: r.status,
    softGateMode: r.soft_gate_mode,
    plan: r.plan,
    inviteCode: r.invite_code,
    pastorAssistEnabled: r.pastor_assist_enabled ?? false,
    allowPrayerAi: r.allow_prayer_ai ?? false,
  };
}

export function mapMembership(r: any, roles: string[] = [], groupIds: string[] = []): Membership {
  return {
    id: r.id,
    churchId: r.church_id,
    userId: r.user_id ?? null,
    displayName: r.display_name,
    email: r.email ?? undefined,
    status: r.status,
    roles: roles as Membership["roles"],
    groupIds,
    joinedAt: r.joined_at ?? undefined,
  };
}

export function mapGroup(r: any): Group {
  return {
    id: r.id,
    churchId: r.church_id,
    name: loc(r.name),
    description: r.description ? loc(r.description) : undefined,
    leaderMembershipId: r.leader_membership_id ?? undefined,
    status: r.status,
  };
}

export function mapContent(r: any): ContentItem {
  return {
    id: r.id,
    churchId: r.church_id,
    groupId: r.group_id ?? undefined,
    authorMembershipId: r.author_membership_id ?? undefined,
    type: r.type,
    status: r.status,
    visibility: r.visibility,
    title: loc(r.title),
    body: loc(r.body),
    scriptureReference: r.scripture_reference ?? undefined,
    scriptureTranslation: r.scripture_translation ?? undefined,
    scriptureQuote: r.scripture_quote ? loc(r.scripture_quote) : undefined,
    copyrightNotice: r.copyright_notice ?? undefined,
    reflectionQuestion: r.reflection_question ? loc(r.reflection_question) : undefined,
    prayerGuide: r.prayer_guide ? loc(r.prayer_guide) : undefined,
    requestedVisibility: r.requested_visibility ?? undefined,
    anonymous: r.anonymous ?? false,
    includesThirdParty: r.includes_third_party ?? false,
    sensitiveFlags: r.sensitive_flags ?? [],
    prayerOutcome: r.prayer_outcome ?? undefined,
    scheduledAt: r.scheduled_at ?? undefined,
    publishedAt: r.published_at ?? undefined,
    expiresAt: r.expires_at ?? undefined,
    devotionDate: r.devotion_date ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapNotification(r: any): AppNotification {
  return {
    id: r.id,
    churchId: r.church_id,
    recipientMembershipId: r.recipient_membership_id ?? undefined,
    type: r.type,
    channel: r.channel,
    title: loc(r.title),
    body: r.body ? loc(r.body) : undefined,
    status: r.status,
    scheduledAt: r.scheduled_at ?? undefined,
    sentAt: r.sent_at ?? undefined,
    failureReason: r.failure_reason ?? undefined,
    createdAt: r.created_at,
    read: r.read ?? false,
  };
}
