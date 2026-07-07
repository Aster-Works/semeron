import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RETENTION_POLICY, type Church, type ContentItem } from "@/app/lib/demo/types";
import type { PrayerVM } from "@/app/lib/db/queries";
import { TodayPrayerCarousel } from "@/app/components/member/TodayPrayerCarousel";

vi.mock("@/app/lib/db/actions", () => ({
  toggleReaction: vi.fn(async () => ({ ok: true })),
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
    isMine: false,
  };
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
    fireEvent.click(screen.getByRole("button", { name: "祈りました" }));

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
    expect(screen.getByRole("button", { name: "祈りました" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "さらに祈る" })).not.toBeInTheDocument();
  });
});
