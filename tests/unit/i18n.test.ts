/**
 * i18n 完全性テスト。全メッセージが ja/en 両方を持つことを保証する
 * （日英対応を後付けにしない、という設計原則を機械的に守る）。
 */
import { describe, expect, it } from "vitest";
import { createT, localize } from "@/app/lib/i18n";
import { messages } from "@/app/lib/i18n/messages";

describe("messages dictionary", () => {
  const entries = Object.entries(messages);

  it("has at least the core keys", () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it("every key has non-empty ja and en (a few intentional exceptions allowed)", () => {
    // "common.people" の en は言語構造上あえて空にしている（"3人" vs "3 people"）
    const allowedEmpty = new Set<string>(["common.people"]);
    const bad: string[] = [];
    for (const [key, value] of entries) {
      if (allowedEmpty.has(key)) continue;
      if (!value.ja || !value.ja.trim()) bad.push(`${key}.ja`);
      if (!value.en || !value.en.trim()) bad.push(`${key}.en`);
    }
    expect(bad).toEqual([]);
  });
});

describe("createT", () => {
  it("returns the locale string", () => {
    expect(createT("ja")("app.name")).toBe("Semeron");
    expect(createT("en")("today.word")).toBe("Today's Word");
    expect(createT("ja")("today.word")).toBe("今日のみことば");
  });
});

describe("localize", () => {
  it("falls back to the church default locale when a locale is empty", () => {
    // 英語のみのコンテンツを ja で引くと en にフォールバック
    expect(localize({ en: "Hello" }, "ja", "en")).toBe("Hello");
    expect(localize({ ja: "こんにちは", en: "" }, "en", "ja")).toBe("こんにちは");
    expect(localize(undefined, "ja")).toBe("");
  });
});
