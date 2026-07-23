import { describe, expect, it } from "vitest";
import { notExpiredOr } from "@/app/lib/prayers/feedFilters";

// 期限切れ×証しコメント付きの課題は「answered_at から1日だけ」表示して消える。
describe("notExpiredOr", () => {
  const now = "2026-07-24T12:00:00.000Z";

  it("keeps no-expiry and future-expiry rows", () => {
    const cond = notExpiredOr(now);
    expect(cond).toContain("expires_at.is.null");
    expect(cond).toContain(`expires_at.gt.${now}`);
  });

  it("keeps answered rows only within 1 day of answered_at", () => {
    const cond = notExpiredOr(now);
    // 1日前ちょうどが境界（それより新しい記録だけ残る）
    expect(cond).toContain(
      "and(prayer_outcome.in.(answered,thanksgiving),metadata->>answered_at.gt.2026-07-23T12:00:00.000Z)",
    );
    // 旧仕様（無期限に残す単独条件）が復活していないこと
    expect(cond).not.toMatch(/,prayer_outcome\.in\.\(answered,thanksgiving\)(,|$)/);
  });
});
