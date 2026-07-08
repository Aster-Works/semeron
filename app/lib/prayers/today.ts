import type { PrayerVM } from "@/app/lib/db/queries";
import type { Viewer } from "@/app/lib/demo/types";
import { toDateKey } from "@/app/lib/demo/selectors";

export const TODAY_PRAYER_LIMIT = 5;

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addDaysKey(dateKey: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return date.toISOString().slice(0, 10);
}

function expirationKey(vm: PrayerVM, timezone: string): string | null {
  if (!vm.item.expiresAt) return null;
  const date = new Date(vm.item.expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(date, timezone);
}

function recency(vm: PrayerVM): string {
  return vm.item.publishedAt ?? vm.item.createdAt;
}

function byRecent(a: PrayerVM, b: PrayerVM): number {
  return recency(b).localeCompare(recency(a));
}

function byDailyRotation(dateKey: string, viewerSeed: string) {
  return (a: PrayerVM, b: PrayerVM): number => {
    const ah = stableHash(`${dateKey}:${viewerSeed}:${a.item.id}`);
    const bh = stableHash(`${dateKey}:${viewerSeed}:${b.item.id}`);
    if (ah !== bh) return ah - bh;
    return byRecent(a, b);
  };
}

function byOwnLast(a: PrayerVM, b: PrayerVM): number {
  return Number(a.isMine) - Number(b.isMine);
}

function isOpenPublishedPrayer(vm: PrayerVM, now: Date): boolean {
  if (vm.item.status !== "published") return false;
  if (vm.item.prayerOutcome && vm.item.prayerOutcome !== "open") return false;
  if (!vm.item.expiresAt) return true;
  const expiresAt = new Date(vm.item.expiresAt).getTime();
  return Number.isNaN(expiresAt) || expiresAt > now.getTime();
}

function isVisibleToViewer(vm: PrayerVM, viewer: Viewer): boolean {
  if (vm.item.visibility !== "group") return true;
  if (vm.isMine) return true;
  return Boolean(vm.item.groupId && viewer.membership?.groupIds.includes(vm.item.groupId));
}

function isUrgent(vm: PrayerVM): boolean {
  return vm.item.sensitiveFlags?.includes("self_harm_or_immediate_danger") ?? false;
}

function isDateBound(vm: PrayerVM, todayKey: string, timezone: string): boolean {
  const key = expirationKey(vm, timezone);
  if (!key) return false;
  return key >= todayKey && key <= addDaysKey(todayKey, 7);
}

function isNearViewer(vm: PrayerVM, viewer: Viewer): boolean {
  if (!viewer.membership) return false;
  return Boolean(vm.item.groupId && viewer.membership.groupIds.includes(vm.item.groupId));
}

/**
 * Today用の「今日の祈り」を選ぶ。
 * DBに選出状態を保存せず、日付 + 閲覧者 + 祈祷課題IDから決定論的に5件へ絞る。
 */
export function selectTodayPrayers(
  prayers: PrayerVM[],
  viewer: Viewer,
  now: Date = new Date(),
  limit = TODAY_PRAYER_LIMIT,
): PrayerVM[] {
  const todayKey = toDateKey(now, viewer.church.timezone);
  const viewerSeed = viewer.membership?.id ?? "guest";
  const timezone = viewer.church.timezone;
  const active = prayers.filter((vm) => isOpenPublishedPrayer(vm, now) && isVisibleToViewer(vm, viewer));
  const selected: PrayerVM[] = [];
  const selectedIds = new Set<string>();

  const addOne = (candidates: PrayerVM[]) => {
    const next = candidates.find((vm) => !selectedIds.has(vm.item.id));
    if (!next) return;
    selected.push(next);
    selectedIds.add(next.item.id);
  };

  const rotationSort = byDailyRotation(todayKey, viewerSeed);

  addOne(
    active
      .filter(isUrgent)
      .sort((a, b) => byOwnLast(a, b) || byRecent(a, b) || rotationSort(a, b)),
  );
  addOne(
    active
      .filter((vm) => isDateBound(vm, todayKey, timezone))
      .sort((a, b) => {
        const ak = expirationKey(a, timezone) ?? "9999-12-31";
        const bk = expirationKey(b, timezone) ?? "9999-12-31";
        return ak.localeCompare(bk) || byOwnLast(a, b) || rotationSort(a, b);
      }),
  );
  addOne(
    active
      .filter((vm) => isNearViewer(vm, viewer))
      .sort((a, b) => byOwnLast(a, b) || rotationSort(a, b)),
  );
  addOne(
    active
      .filter((vm) => !vm.prayedToday)
      .sort((a, b) => a.prayedCount - b.prayedCount || byOwnLast(a, b) || rotationSort(a, b)),
  );
  addOne(active.sort(rotationSort));

  if (selected.length < limit) {
    for (const vm of [...active].sort(rotationSort)) {
      if (selected.length >= limit) break;
      if (selectedIds.has(vm.item.id)) continue;
      selected.push(vm);
      selectedIds.add(vm.item.id);
    }
  }

  return selected.slice(0, limit);
}
