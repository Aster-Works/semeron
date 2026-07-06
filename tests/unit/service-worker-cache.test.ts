import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

describe("service worker privacy cache policy", () => {
  it("does not cache navigations or app shell HTML routes", () => {
    expect(source).not.toMatch(/req\.mode\s*===\s*["']navigate["']/);
    expect(source).not.toMatch(/caches\.match\(["']\/["']\)/);
    expect(source).not.toContain("APP_SHELL");
    expect(source).not.toContain('"/ja"');
    expect(source).not.toContain('"/en"');
  });

  it("keeps cache scope to app-owned assets and supports explicit purge", () => {
    expect(source).toContain("SEMERON_PURGE_CACHES");
    expect(source).not.toContain('"/_next/static/"');
    expect(source).toContain('"/icons/"');
    expect(source).toContain('"/manifest.webmanifest"');
    expect(source).toContain("semeron-static-v3");
  });
});
