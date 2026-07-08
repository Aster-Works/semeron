import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RETENTION_POLICY, type Church, type ContentItem } from "@/app/lib/demo/types";
import type { PrayerVM } from "@/app/lib/db/queries";
import { TodayPrayerCarousel } from "@/app/components/member/TodayPrayerCarousel";

vi.mock("@/app/lib/db/actions", () => ({
  logPrayer: vi.fn(async () => ({ ok: true })),
}));

const church: Church = {
  id: "church_1",
  slug: "eifuku-minami",
  name: { ja: "永福南キリスト教会" },
  defaultLocale: "ja",
  contentLanguages: ["ja"],
  timezone: "Asia/Tokyo",
  morningNotificationTime: "06:30",
  status: "active",
  plan: "small",
  inviteCode: "invite",
  aiAddonEnabled: false,
  pastorAssistEnabled: false,
  allowPrayerAi: false,
  retentionPolicy: DEFAULT_RETENTION_POLICY,
  roleLabels: {},
};

function prayer(viewerPrayed: boolean, id = "prayer_1"): PrayerVM {
  const item: ContentItem = {
    id,
    churchId: church.id,
    type: "prayer_request",
    status: "published",
    visibility: "church",
    title: { ja: "病の中にある方のため" },
    body: { ja: "主の慰めと支えを祈ります。" },
    prayerOutcome: "open",
    createdAt: "2026-07-04T00:00:00+09:00",
    updatedAt: "2026-07-04T00:00:00+09:00",
    publishedAt: "2026-07-04T00:00:00+09:00",
  };

  return {
    item,
    authorName: "Member",
    prayedCount: viewerPrayed ? 1 : 0,
    viewerPrayed,
    prayedToday: viewerPrayed,
    isMine: false,
  };
}

/** 「一度でも祈った」と「今日祈った」を別々に指定できる版（日次リセットのテスト用）。 */
function prayerWithState(overrides: { prayedCount: number; viewerPrayed: boolean; prayedToday: boolean }): PrayerVM {
  const base = prayer(false);
  return { ...base, ...overrides };
}

describe("TodayPrayerCarousel", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not show the pray-more link on an active prayer card", () => {
    render(
      <TodayPrayerCarousel
        prayers={[prayer(false)]}
        church={church}
        locale="ja"
        prayersHref="/ja/church/eifuku-minami/prayers"
        animate={false}
      />,
    );

    expect(screen.getByRole("button", { name: "祈りました" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "さらに祈る" })).not.toBeInTheDocument();
  });

  it("keeps the pray-more link on the completed-prayer card", () => {
    render(
      <TodayPrayerCarousel
        prayers={[prayer(true)]}
        church={church}
        locale="ja"
        prayersHref="/ja/church/eifuku-minami/prayers"
        animate={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "さらに祈る" })).not.toBeInTheDocument();
    // 今日すでに祈っている課題は「済」表示。押すと再記録せず次へ進む。
    fireEvent.click(screen.getByRole("button", { name: "済" }));

    expect(screen.getByRole("link", { name: "さらに祈る" })).toBeInTheDocument();
  });

  it("starts at the first card even when all five prayers were already prayed", () => {
    render(
      <TodayPrayerCarousel
        prayers={Array.from({ length: 5 }, (_, index) => prayer(true, `prayer_${index + 1}`))}
        church={church}
        locale="ja"
        prayersHref="/ja/church/eifuku-minami/prayers"
        animate={false}
      />,
    );

    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "済" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "さらに祈る" })).not.toBeInTheDocument();
  });

  it("shows 済 right after praying today", async () => {
    render(
      <TodayPrayerCarousel
        prayers={[prayerWithState({ prayedCount: 3, viewerPrayed: false, prayedToday: false })]}
        church={church}
        locale="ja"
        prayersHref="/ja/church/eifuku-minami/prayers"
        animate={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "祈りました" }));
    fireEvent.click(await screen.findByRole("button", { name: "もう一度祈る" }));

    expect(screen.getByRole("button", { name: "済" })).toBeInTheDocument();
  });

  it("reverts to 祈りました on a new day even though the member prayed before", () => {
    // 翌日: サーバーは prayedToday=false（一度は祈ったので viewerPrayed は true のまま）
    render(
      <TodayPrayerCarousel
        prayers={[prayerWithState({ prayedCount: 4, viewerPrayed: true, prayedToday: false })]}
        church={church}
        locale="ja"
        prayersHref="/ja/church/eifuku-minami/prayers"
        animate={false}
      />,
    );

    expect(screen.getByRole("button", { name: "祈りました" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "済" })).not.toBeInTheDocument();
  });

  it("increments the aggregate count on a first-ever prayer, not on later same-day repeats", async () => {
    render(
      <TodayPrayerCarousel
        prayers={[prayerWithState({ prayedCount: 3, viewerPrayed: false, prayedToday: false })]}
        church={church}
        locale="ja"
        prayersHref="/ja/church/eifuku-minami/prayers"
        animate={false}
      />,
    );

    expect(screen.getByText("3人が祈っています")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "祈りました" }));
    fireEvent.click(await screen.findByRole("button", { name: "もう一度祈る" }));

    expect(await screen.findByText("4人が祈っています")).toBeInTheDocument();
  });

  it("does not double-count the aggregate when returning to pray again on a later day", async () => {
    render(
      <TodayPrayerCarousel
        prayers={[prayerWithState({ prayedCount: 3, viewerPrayed: true, prayedToday: false })]}
        church={church}
        locale="ja"
        prayersHref="/ja/church/eifuku-minami/prayers"
        animate={false}
      />,
    );

    expect(screen.getByText("3人が祈っています")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "祈りました" }));
    fireEvent.click(await screen.findByRole("button", { name: "もう一度祈る" }));

    expect(screen.getByText("3人が祈っています")).toBeInTheDocument();
  });
});
