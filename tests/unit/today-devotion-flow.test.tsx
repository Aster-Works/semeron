import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RETENTION_POLICY, type Church, type ContentItem } from "@/app/lib/demo/types";
import type { PrayerVM, ReflectionVM } from "@/app/lib/db/queries";
import { TodayDevotionFlow } from "@/app/components/member/TodayDevotionFlow";

vi.mock("@/app/lib/db/actions", () => ({
  postReflection: vi.fn(async () => ({ ok: true })),
  setCompletion: vi.fn(async () => ({ ok: true })),
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

const devotion: ContentItem = {
  id: "devotion_1",
  churchId: church.id,
  type: "devotion",
  status: "published",
  visibility: "church",
  title: { ja: "主に聞く朝" },
  body: { ja: "今日、主の御声に耳を傾けます。" },
  scriptureReference: "詩篇 46:10",
  scriptureTranslation: "新改訳2017",
  scriptureQuote: { ja: "やめよ。知れ。わたしこそ神。" },
  reflectionQuestion: { ja: "何を静めるよう招かれていますか。" },
  prayerGuide: { ja: "主の前に心を静めましょう。" },
  devotionDate: "2026-07-04",
  createdAt: "2026-07-04T00:00:00+09:00",
  updatedAt: "2026-07-04T00:00:00+09:00",
  publishedAt: "2026-07-04T00:00:00+09:00",
};

const dailyOpenKey = "semeron:today-flow-opened:church_1:2026-07-04";
let scrollIntoViewMock: ReturnType<typeof vi.fn>;

function installLocalStorage({ throwOnReadWrite = false }: { throwOnReadWrite?: boolean } = {}) {
  const store = new Map<string, string>();
  const storage = {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => {
      if (throwOnReadWrite) throw new Error("localStorage unavailable");
      return store.get(key) ?? null;
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => store.delete(key)),
    setItem: vi.fn((key: string, value: string) => {
      if (throwOnReadWrite) throw new Error("localStorage unavailable");
      store.set(key, value);
    }),
  } satisfies Storage;

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });

  return storage;
}

function clearDocumentCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (!name) return;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  });
}

function prayerVm(id: string, viewerPrayed = false): PrayerVM {
  return {
    item: {
      id,
      churchId: church.id,
      type: "prayer_request",
      status: "published",
      visibility: "church",
      title: { ja: `祈り ${id}` },
      body: { ja: `${id}のために祈ります。` },
      prayerOutcome: "open",
      createdAt: "2026-07-04T00:00:00+09:00",
      updatedAt: "2026-07-04T00:00:00+09:00",
      publishedAt: "2026-07-04T00:00:00+09:00",
    },
    authorName: "Member",
    prayedCount: viewerPrayed ? 1 : 0,
    viewerPrayed,
    isMine: false,
  };
}

function reflectionVm(id: string): ReflectionVM {
  return {
    item: {
      id,
      churchId: church.id,
      type: "reflection",
      status: "published",
      visibility: "church",
      title: { ja: "応答" },
      body: { ja: "主に信頼します。" },
      createdAt: "2026-07-04T00:00:00+09:00",
      updatedAt: "2026-07-04T00:00:00+09:00",
      publishedAt: "2026-07-04T00:00:00+09:00",
    },
    authorName: "Member",
    isMine: false,
    reactions: [],
  };
}

function renderFlow({
  animationReplayKey,
  prayers = [],
  reflections = [],
}: {
  animationReplayKey?: string;
  prayers?: PrayerVM[];
  reflections?: ReflectionVM[];
} = {}) {
  return render(
    <TodayDevotionFlow
      devotion={devotion}
      church={church}
      locale="ja"
      todayKey="2026-07-04"
      animationReplayKey={animationReplayKey}
      initialRead={false}
      initialPrayed={false}
      prayers={prayers}
      reflections={reflections}
      shareHref="/ja/church/eifuku-minami/prayers/new"
      prayersHref="/ja/church/eifuku-minami/prayers"
      talkToPastorLabel="牧師に相談する"
    />,
  );
}

async function finishInitialTimers() {
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
}

async function scrollDown() {
  await act(async () => {
    fireEvent.wheel(window, { deltaY: 24 });
  });
}

async function waitForGestureWindow(ms = 920) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("TodayDevotionFlow daily animation replay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installLocalStorage();
    window.localStorage.clear();
    clearDocumentCookies();
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(window.performance.now()), 0),
    );
    window.cancelAnimationFrame = vi.fn((id: number) => window.clearTimeout(id));
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    scrollIntoViewMock = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
    clearDocumentCookies();
  });

  it("marks the first normal open and keeps the same-day remount static", async () => {
    const firstRender = renderFlow();
    await finishInitialTimers();

    expect(screen.getByTestId("today-flow")).toHaveAttribute("data-animate-flow", "true");
    expect(window.localStorage.getItem(dailyOpenKey)).toBe("true");

    firstRender.unmount();
    renderFlow();
    await finishInitialTimers();

    const flow = screen.getByTestId("today-flow");
    expect(flow).toHaveAttribute("data-animate-flow", "false");
    expect(flow).toHaveAttribute("data-animation-replay", "false");
    expect(screen.queryByTestId("today-scroll-cue")).not.toBeInTheDocument();
  });

  it("keeps the normal same-day revisit static after the daily open flag exists", async () => {
    window.localStorage.setItem(dailyOpenKey, "true");

    renderFlow();
    await finishInitialTimers();

    const flow = screen.getByTestId("today-flow");
    expect(flow).toHaveAttribute("data-animate-flow", "false");
    expect(flow).toHaveAttribute("data-animation-replay", "false");
    expect(screen.queryByTestId("today-scroll-cue")).not.toBeInTheDocument();
  });

  it("falls back to a daily cookie when localStorage is unavailable", async () => {
    installLocalStorage({ throwOnReadWrite: true });

    const firstRender = renderFlow();
    await finishInitialTimers();

    expect(screen.getByTestId("today-flow")).toHaveAttribute("data-animate-flow", "true");
    expect(document.cookie).toMatch(/semeron_today_flow_[a-z0-9]+=true/);

    firstRender.unmount();
    renderFlow();
    await finishInitialTimers();

    const flow = screen.getByTestId("today-flow");
    expect(flow).toHaveAttribute("data-animate-flow", "false");
    expect(flow).toHaveAttribute("data-animation-replay", "false");
    expect(screen.queryByTestId("today-scroll-cue")).not.toBeInTheDocument();
  });

  it("replays the Today animation for an explicit verification key even after the daily open flag exists", async () => {
    window.localStorage.setItem(dailyOpenKey, "true");

    renderFlow({ animationReplayKey: "pwa-check" });
    await finishInitialTimers();

    const flow = screen.getByTestId("today-flow");
    expect(flow).toHaveAttribute("data-animate-flow", "true");
    expect(flow).toHaveAttribute("data-animation-replay", "true");
    expect(screen.getByTestId("today-scroll-cue")).toBeInTheDocument();
    expect(window.localStorage.getItem(dailyOpenKey)).toBe("true");
  });

  it("keeps prayer links, the response, and recent reflections behind separate scroll moments", async () => {
    window.localStorage.setItem(dailyOpenKey, "true");

    renderFlow({
      animationReplayKey: "stage-check",
      prayers: [prayerVm("prayer_1", true)],
      reflections: [reflectionVm("reflection_1")],
    });
    await finishInitialTimers();

    expect(screen.queryByTestId("today-prayer-links")).not.toBeInTheDocument();
    expect(screen.queryByTestId("today-reflection-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("today-recent-reflections")).not.toBeInTheDocument();

    await scrollDown();
    expect(screen.getByTestId("today-devotion-guidance-stage")).toBeInTheDocument();
    expect(screen.getByTestId("today-scroll-cue")).toHaveTextContent("今日の祈りへ");

    await waitForGestureWindow();
    await scrollDown();

    expect(screen.getByTestId("today-scroll-cue")).toHaveTextContent("続きへ");
    expect(screen.getByTestId("today-prayer-stage")).toBeInTheDocument();
    expect(screen.queryByTestId("today-prayer-links")).not.toBeInTheDocument();
    expect(screen.queryByTestId("today-reflection-section")).not.toBeInTheDocument();

    await waitForGestureWindow();
    await scrollDown();
    expect(screen.getByTestId("today-prayer-links")).toBeInTheDocument();
    expect(screen.queryByTestId("today-reflection-section")).not.toBeInTheDocument();

    await waitForGestureWindow();
    await scrollDown();
    expect(screen.getByTestId("today-reflection-section")).toBeInTheDocument();
    expect(screen.getByTestId("today-scroll-cue")).toHaveTextContent("みんなの応答へ");
    expect(screen.queryByTestId("today-recent-reflections")).not.toBeInTheDocument();

    await waitForGestureWindow();
    await scrollDown();
    expect(screen.getByTestId("today-recent-reflections")).toBeInTheDocument();
    expect(screen.queryByTestId("today-scroll-cue")).not.toBeInTheDocument();
  });

  it("clicks the scroll cue to advance and scroll toward the next animated block", async () => {
    window.localStorage.setItem(dailyOpenKey, "true");

    renderFlow({
      animationReplayKey: "cue-click",
      prayers: [prayerVm("prayer_1", false)],
    });
    await finishInitialTimers();

    await act(async () => {
      fireEvent.click(screen.getByTestId("today-scroll-cue"));
    });
    await act(async () => {
      vi.advanceTimersByTime(140);
    });

    expect(screen.getByTestId("today-devotion-guidance-stage")).toBeInTheDocument();
    expect(screen.getByTestId("today-scroll-cue")).toHaveTextContent("今日の祈りへ");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });
});
