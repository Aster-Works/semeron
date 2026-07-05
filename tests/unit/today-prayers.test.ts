import { describe, expect, it } from "vitest";
import {
  DEFAULT_RETENTION_POLICY,
  type Church,
  type ContentItem,
  type Membership,
  type Viewer,
} from "@/app/lib/demo/types";
import type { PrayerVM } from "@/app/lib/db/queries";
import { selectTodayPrayers } from "@/app/lib/prayers/today";

const church: Church = {
  id: "church_1",
  slug: "eifuku-minami",
  name: { ja: "永福南キリスト教会" },
  defaultLocale: "ja",
  contentLanguages: ["ja"],
  timezone: "Asia/Tokyo",
  morningNotificationTime: "06:30",
  status: "active",
  softGateMode: "gentle",
  plan: "small",
  inviteCode: "invite",
  pastorAssistEnabled: false,
  allowPrayerAi: false,
  retentionPolicy: DEFAULT_RETENTION_POLICY,
  roleLabels: {},
};

const membership: Membership = {
  id: "member_1",
  churchId: church.id,
  userId: "user_1",
  displayName: "Jimi",
  status: "active",
  roles: ["member"],
  groupIds: ["group_young"],
};

const viewer: Viewer = { church, membership };

function vm(
  id: string,
  overrides: Partial<ContentItem> & Partial<Pick<PrayerVM, "prayedCount" | "viewerPrayed" | "isMine">> = {},
): PrayerVM {
  const { prayedCount, viewerPrayed, isMine, ...itemOverrides } = overrides;
  const item: ContentItem = {
    id,
    churchId: church.id,
    type: "prayer_request",
    status: "published",
    visibility: "church",
    title: { ja: id },
    body: { ja: `${id} body` },
    prayerOutcome: "open",
    createdAt: "2026-07-01T00:00:00+09:00",
    updatedAt: "2026-07-01T00:00:00+09:00",
    publishedAt: "2026-07-01T00:00:00+09:00",
    ...itemOverrides,
  };

  return {
    item,
    authorName: "Member",
    prayedCount: prayedCount ?? 3,
    viewerPrayed: viewerPrayed ?? false,
    isMine: isMine ?? false,
  };
}

describe("selectTodayPrayers", () => {
  const now = new Date("2026-07-04T08:00:00+09:00");

  it("selects up to five prayers from five pastoral signals", () => {
    const selected = selectTodayPrayers(
      [
        vm("urgent", {
          sensitiveFlags: ["self_harm_or_immediate_danger"],
          prayedCount: 10,
          viewerPrayed: true,
        }),
        vm("date-bound", {
          expiresAt: "2026-07-05T12:00:00+09:00",
          prayedCount: 10,
          viewerPrayed: true,
        }),
        vm("near-group", {
          visibility: "group",
          groupId: "group_young",
          prayedCount: 10,
          viewerPrayed: true,
        }),
        vm("under-prayed", { prayedCount: 0, viewerPrayed: false }),
        vm("rotation-a", { prayedCount: 7, viewerPrayed: true }),
        vm("rotation-b", { prayedCount: 8, viewerPrayed: true }),
      ],
      viewer,
      now,
    );

    const ids = selected.map((p) => p.item.id);
    expect(selected).toHaveLength(5);
    expect(ids).toContain("urgent");
    expect(ids).toContain("date-bound");
    expect(ids).toContain("near-group");
    expect(ids).toContain("under-prayed");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the same viewer's set stable within the same day", () => {
    const prayers = Array.from({ length: 8 }, (_, index) =>
      vm(`rotation-${index}`, { prayedCount: 5, viewerPrayed: true }),
    );

    const morning = selectTodayPrayers(prayers, viewer, new Date("2026-07-04T06:00:00+09:00")).map((p) => p.item.id);
    const evening = selectTodayPrayers(prayers, viewer, new Date("2026-07-04T21:00:00+09:00")).map((p) => p.item.id);

    expect(evening).toEqual(morning);
  });

  it("does not select prayers scoped to another small group", () => {
    const selected = selectTodayPrayers(
      [
        vm("other-group", {
          visibility: "group",
          groupId: "group_other",
          prayedCount: 0,
          viewerPrayed: false,
        }),
        vm("own-group", {
          visibility: "group",
          groupId: "group_young",
          prayedCount: 0,
          viewerPrayed: false,
        }),
        vm("church-wide", {
          prayedCount: 0,
          viewerPrayed: false,
        }),
      ],
      viewer,
      now,
    );

    const ids = selected.map((p) => p.item.id);
    expect(ids).toContain("own-group");
    expect(ids).toContain("church-wide");
    expect(ids).not.toContain("other-group");
  });

  it("rotates the fallback set when the church day changes", () => {
    const prayers = Array.from({ length: 12 }, (_, index) =>
      vm(`rotation-${index}`, { prayedCount: 5, viewerPrayed: true }),
    );

    const dayOne = selectTodayPrayers(prayers, viewer, new Date("2026-07-04T08:00:00+09:00")).map((p) => p.item.id);
    const dayTwo = selectTodayPrayers(prayers, viewer, new Date("2026-07-05T08:00:00+09:00")).map((p) => p.item.id);

    expect(dayTwo).not.toEqual(dayOne);
  });

  it("skips completed and expired requests for Today", () => {
    const selected = selectTodayPrayers(
      [
        vm("answered", { prayerOutcome: "answered" }),
        vm("thanksgiving", { prayerOutcome: "thanksgiving" }),
        vm("expired", { expiresAt: "2026-07-03T23:59:00+09:00" }),
        vm("open-a"),
        vm("open-b"),
      ],
      viewer,
      now,
    );

    expect(selected.map((p) => p.item.id).sort()).toEqual(["open-a", "open-b"]);
  });
});
