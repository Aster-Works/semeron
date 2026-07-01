import { describe, expect, it } from "vitest";
import { extractJson, asStringArray, asString } from "@/app/lib/pastor-assist/parse";
import { redactNames } from "@/app/lib/pastor-assist/redact";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses ```json fenced blocks", () => {
    const t = 'Here you go:\n```json\n{"title":"Hi"}\n```\nthanks';
    expect(extractJson(t)).toEqual({ title: "Hi" });
  });

  it("extracts an object embedded in prose", () => {
    const t = 'Sure! {"risk_level":"low","flags":[]} — hope that helps';
    expect(extractJson(t)).toEqual({ risk_level: "low", flags: [] });
  });

  it("handles nested braces and strings containing braces", () => {
    const t = '{"a":{"b":"has } brace"},"c":[1,2]}';
    expect(extractJson(t)).toEqual({ a: { b: "has } brace" }, c: [1, 2] });
  });

  it("parses a top-level array", () => {
    expect(extractJson('[{"question":"Q"}]')).toEqual([{ question: "Q" }]);
  });

  it("returns null on unparseable input", () => {
    expect(extractJson("no json here at all")).toBeNull();
    expect(extractJson("")).toBeNull();
  });
});

describe("asStringArray / asString", () => {
  it("normalizes arrays and drops empties", () => {
    expect(asStringArray(["a", "", "  ", "b"])).toEqual(["a", "b"]);
    expect(asStringArray("single")).toEqual(["single"]);
    expect(asStringArray(null)).toEqual([]);
    expect(asStringArray(42)).toEqual([]);
  });
  it("asString falls back", () => {
    expect(asString("x")).toBe("x");
    expect(asString(undefined, "fb")).toBe("fb");
    expect(asString(123)).toBe("");
  });
});

describe("redactNames (privacy by default)", () => {
  it("redacts a full name and its parts, counting hits", () => {
    const r = redactNames("山田 太郎さんのために祈ってください。太郎さんは入院中です。", ["山田 太郎"]);
    expect(r.text).not.toContain("山田");
    expect(r.text).not.toContain("太郎");
    expect(r.redactedCount).toBeGreaterThanOrEqual(2);
    expect(r.redactedNames.length).toBeGreaterThan(0);
  });

  it("redacts multiple members", () => {
    const r = redactNames("Please pray for John and Mary.", ["John Smith", "Mary Jones"]);
    expect(r.text).not.toContain("John");
    expect(r.text).not.toContain("Mary");
  });

  it("does not over-redact unrelated text and leaves non-members intact", () => {
    const r = redactNames("Pray for wisdom at work.", ["山田 太郎"]);
    expect(r.text).toBe("Pray for wisdom at work.");
    expect(r.redactedCount).toBe(0);
  });

  it("ignores too-short name tokens", () => {
    const r = redactNames("a good day", ["a"]);
    expect(r.text).toBe("a good day");
  });

  it("handles empty input safely", () => {
    expect(redactNames("", ["山田"]).text).toBe("");
    expect(redactNames("text", []).redactedCount).toBe(0);
  });
});
