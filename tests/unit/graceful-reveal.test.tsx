import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GracefulReveal, IN_VIEW_REVEAL_OPTIONS } from "@/app/components/member/GracefulReveal";

describe("GracefulReveal", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("waits until an in-view section is deeper in the viewport before revealing", () => {
    let observedOptions: IntersectionObserverInit | undefined;

    class MockIntersectionObserver {
      constructor(_callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observedOptions = options;
      }

      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<GracefulReveal trigger="in-view">黙想</GracefulReveal>);

    expect(observedOptions).toEqual(IN_VIEW_REVEAL_OPTIONS);
    expect(observedOptions?.rootMargin).toBe("0px 0px -32% 0px");
    expect(observedOptions?.threshold).toBe(0.24);
  });
});
