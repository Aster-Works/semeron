import { describe, expect, it } from "vitest";
import { safeNotificationPath } from "@/app/lib/notifications/paths";

describe("notification click paths", () => {
  it("keeps safe app-relative targets", () => {
    expect(safeNotificationPath("/ja/church/eifuku-minami/today")).toBe(
      "/ja/church/eifuku-minami/today",
    );
    expect(safeNotificationPath("/en/church/grace-community/prayers?tab=mine#latest")).toBe(
      "/en/church/grace-community/prayers?tab=mine#latest",
    );
  });

  it("rejects external or malformed targets", () => {
    expect(safeNotificationPath("https://example.com/")).toBe("/");
    expect(safeNotificationPath("//example.com/")).toBe("/");
    expect(safeNotificationPath("/\\example")).toBe("/");
    expect(safeNotificationPath("ja/church/eifuku-minami/today")).toBe("/");
    expect(safeNotificationPath(null)).toBe("/");
  });
});
