import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrayerCard } from "@/app/components/member/PrayerCard";
import { ReflectionCard } from "@/app/components/member/ReflectionCard";
import { LocaleProvider } from "@/app/lib/i18n/LocaleProvider";
import {
  DEFAULT_RETENTION_POLICY,
  type Church,
  type ContentItem,
} from "@/app/lib/demo/types";
import type { PrayerVM, ReflectionVM } from "@/app/lib/db/queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/lib/db/actions", () => ({
  requestAdminReview: vi.fn(async () => ({ ok: true })),
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
  softGateMode: "gentle",
  plan: "small",
  inviteCode: "invite",
  aiAddonEnabled: false,
  pastorAssistEnabled: false,
  allowPrayerAi: false,
  retentionPolicy: DEFAULT_RETENTION_POLICY,
  roleLabels: {},
};

const prayerItem: ContentItem = {
  id: "prayer_1",
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

const reflectionItem: ContentItem = {
  id: "reflection_1",
  churchId: church.id,
  type: "reflection",
  status: "published",
  visibility: "church",
  title: { ja: "応答" },
  body: { ja: "主に信頼します。" },
  createdAt: "2026-07-04T00:00:00+09:00",
  updatedAt: "2026-07-04T00:00:00+09:00",
  publishedAt: "2026-07-04T00:00:00+09:00",
};

describe("reaction scope", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows only prayed on prayer request cards", () => {
    const vm: PrayerVM = {
      item: prayerItem,
      authorName: "Member",
      prayedCount: 1,
      viewerPrayed: false,
      isMine: false,
      reactions: [{ type: "prayed", count: 1, active: false }],
    };

    render(
      <LocaleProvider locale="ja">
        <PrayerCard vm={vm} church={church} locale="ja" />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: /祈りました/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /アーメン/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /感謝/ })).not.toBeInTheDocument();
  });

  it("shows amen and thanks, but not prayed, on reflection cards", () => {
    const vm: ReflectionVM = {
      item: reflectionItem,
      authorName: "匿名",
      isMine: false,
      reactions: [
        { type: "amen", count: 2, active: false },
        { type: "thanks", count: 1, active: true },
      ],
    };

    render(
      <LocaleProvider locale="ja">
        <ReflectionCard vm={vm} church={church} locale="ja" />
      </LocaleProvider>,
    );

    expect(screen.queryByRole("button", { name: /祈りました/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /アーメン/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /感謝/ })).toBeInTheDocument();
  });
});
