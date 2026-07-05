import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayPrayerPreviewFlow } from "@/app/components/member/TodayPrayerPreviewFlow";
import { todayDailyOpenKey } from "@/app/components/member/todayDailyAnimation";

const churchId = "church_1";
const todayKey = "2026-07-05";
const dailyOpenKey = todayDailyOpenKey(churchId, todayKey);

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

function renderPreview(animationReplayKey?: string) {
  return render(
    <TodayPrayerPreviewFlow churchId={churchId} todayKey={todayKey} animationReplayKey={animationReplayKey}>
      <section aria-label="今日の祈り">今日の祈り</section>
    </TodayPrayerPreviewFlow>,
  );
}

async function flushFrame() {
  await act(async () => {
    vi.advanceTimersByTime(0);
  });
}

describe("TodayPrayerPreviewFlow daily animation gate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installLocalStorage();
    window.localStorage.clear();
    clearDocumentCookies();
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(window.performance.now()), 0),
    );
    window.cancelAnimationFrame = vi.fn((id: number) => window.clearTimeout(id));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
    clearDocumentCookies();
  });

  it("animates the prayer-only Today view only on the first normal open of the day", async () => {
    const firstRender = renderPreview();
    await flushFrame();

    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animate-flow", "true");
    expect(window.localStorage.getItem(dailyOpenKey)).toBe("true");
    expect(document.querySelector("[data-reveal-id]")).toBeTruthy();

    firstRender.unmount();
    renderPreview();
    await flushFrame();

    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animate-flow", "false");
    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animation-replay", "false");
    expect(document.querySelector("[data-reveal-id]")).toBeNull();
  });

  it("uses the cookie fallback when localStorage is unavailable", async () => {
    installLocalStorage({ throwOnReadWrite: true });

    const firstRender = renderPreview();
    await flushFrame();

    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animate-flow", "true");
    expect(document.cookie).toMatch(/semeron_today_flow_[a-z0-9]+=true/);

    firstRender.unmount();
    renderPreview();
    await flushFrame();

    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animate-flow", "false");
    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animation-replay", "false");
  });

  it("keeps the explicit replay URL behavior available for verification", async () => {
    window.localStorage.setItem(dailyOpenKey, "true");

    renderPreview("pwa-check");
    await flushFrame();

    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animate-flow", "true");
    expect(screen.getByTestId("today-prayer-preview-flow")).toHaveAttribute("data-animation-replay", "true");
  });
});
