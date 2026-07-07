import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

const CHURCH_ADMIN_ROLES = new Set(["owner", "pastor", "elder", "staff"]);
const MEMBER_MANAGER_ROLES = new Set(["owner", "pastor"]);
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function myMembership(
  supabase: SupabaseClient,
  churchId: string,
): Promise<{ id: string; roles: string[] } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("memberships")
    .select("id, membership_roles(role)")
    .eq("church_id", churchId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data?.id) return null;
  return {
    id: data.id,
    roles: ((data.membership_roles ?? []) as { role: string }[]).map((r) => r.role),
  };
}

export async function myMembershipId(supabase: SupabaseClient, churchId: string): Promise<string | null> {
  return (await myMembership(supabase, churchId))?.id ?? null;
}

export function isChurchAdminRole(roles: string[]): boolean {
  return roles.some((role) => CHURCH_ADMIN_ROLES.has(role));
}

export function canManageMembers(roles: string[]): boolean {
  return roles.some((role) => MEMBER_MANAGER_ROLES.has(role));
}

export function normalizeDateKey(value?: string | null): string | null {
  if (!value) return null;
  return DATE_KEY_RE.test(value) ? value : null;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}

function zonedDateTimeToUtcIso(
  dateKey: string,
  time: { hour: number; minute: number; second?: number; ms?: number },
  timeZone: string,
): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const wallClockUtc = Date.UTC(
    year,
    month - 1,
    day,
    time.hour,
    time.minute,
    time.second ?? 0,
    time.ms ?? 0,
  );
  try {
    const first = wallClockUtc - timeZoneOffsetMs(new Date(wallClockUtc), timeZone);
    const second = wallClockUtc - timeZoneOffsetMs(new Date(first), timeZone);
    return new Date(second).toISOString();
  } catch {
    return new Date(wallClockUtc).toISOString();
  }
}

function parseMorningTime(value?: string | null): { hour: number; minute: number } {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hour: 6, minute: 30 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export async function getChurchTiming(
  supabase: SupabaseClient,
  churchId: string,
): Promise<{ timezone: string; morningTime: string | null }> {
  const { data } = await supabase
    .from("churches")
    .select("timezone, morning_notification_time")
    .eq("id", churchId)
    .maybeSingle();
  return {
    timezone: data?.timezone ?? "UTC",
    morningTime: data?.morning_notification_time ?? null,
  };
}

export function expiryDateToIso(dateKey: string | null, timeZone: string): string | null {
  if (!dateKey) return null;
  return zonedDateTimeToUtcIso(dateKey, { hour: 23, minute: 59, second: 59, ms: 999 }, timeZone);
}

/** dateKey（"YYYY-MM-DD"）の当該タイムゾーンでの 00:00:00 を UTC ISO で返す。 */
export function startOfDayIso(dateKey: string | null, timeZone: string): string | null {
  if (!dateKey) return null;
  return zonedDateTimeToUtcIso(dateKey, { hour: 0, minute: 0 }, timeZone);
}

export function scheduleDateToIso(dateKey: string | null, timeZone: string, morningTime: string | null): string | null {
  if (!dateKey) return null;
  return zonedDateTimeToUtcIso(dateKey, parseMorningTime(morningTime), timeZone);
}
