/**
 * 可視性・権限ロジックのテスト。
 * 04_Data Model and Security_Aster Daily.md §10 Security Test Cases を、
 * デモデータに対して検証する（Phase 2 で RLS に置き換えても守るべき不変条件）。
 */
import { describe, expect, it } from "vitest";
import { DEMO_NOW, contentItems } from "@/app/lib/demo/data";
import {
  buildViewer,
  getChurchById,
  getModerationQueue,
  getPrayerFeed,
  getViewerCompletion,
} from "@/app/lib/demo/selectors";
import {
  canModerate,
  canViewContent,
  isAuthorVisibleTo,
  isChurchAdmin,
} from "@/app/lib/demo/visibility";
import type { Viewer } from "@/app/lib/demo/types";

const grace = getChurchById("ch_grace")!;

const v = (churchId: string, membershipId: string): Viewer =>
  buildViewer(getChurchById(churchId)!, membershipId);

// 永福南の主要ペルソナ
const jimi = v("ch_eifuku", "mem_e_jimi"); // owner + pastor
const hana = v("ch_eifuku", "mem_e_hana"); // elder
const ken = v("ch_eifuku", "mem_e_ken"); // prayer_team
const yuki = v("ch_eifuku", "mem_e_yuki"); // group_leader (青年会)
const aoi = v("ch_eifuku", "mem_e_aoi"); // member (青年会)
const taro = v("ch_eifuku", "mem_e_taro"); // member (no group)

const item = (id: string) => contentItems.find((c) => c.id === id)!;
const canSee = (viewer: Viewer, id: string) => canViewContent(viewer, item(id), DEMO_NOW);

describe("church isolation", () => {
  it("Eifuku member cannot view Grace content", () => {
    expect(canSee(aoi, "ci_g_pr_1")).toBe(false);
    expect(canSee(jimi, "ci_g_pr_1")).toBe(false);
  });

  it("cross-church membership id yields no membership (isolation)", () => {
    const bogus = buildViewer(grace, "mem_e_aoi"); // Eifuku member on Grace church
    expect(bogus.membership).toBeNull();
    expect(getPrayerFeed(bogus)).toHaveLength(0);
  });
});

describe("pending_review (未承認の漏洩ゼロ)", () => {
  it("hidden from a normal member", () => {
    expect(canSee(taro, "ci_e_pr_pending_sensitive")).toBe(false);
    expect(getPrayerFeed(taro).some((c) => c.id === "ci_e_pr_pending_sensitive")).toBe(false);
  });
  it("visible to the author", () => {
    const emi = v("ch_eifuku", "mem_e_emi");
    expect(canSee(emi, "ci_e_pr_pending_sensitive")).toBe(true);
  });
  it("visible to reviewers (pastor / elder / prayer_team)", () => {
    expect(canSee(jimi, "ci_e_pr_pending_sensitive")).toBe(true);
    expect(canSee(hana, "ci_e_pr_pending_sensitive")).toBe(true);
    expect(canSee(ken, "ci_e_pr_pending_sensitive")).toBe(true);
  });
});

describe("visibility roles", () => {
  it("prayer_team visibility: prayer team & admins yes, normal member no", () => {
    expect(canSee(ken, "ci_e_pr_prayerteam")).toBe(true);
    expect(canSee(hana, "ci_e_pr_prayerteam")).toBe(true);
    expect(canSee(jimi, "ci_e_pr_prayerteam")).toBe(true);
    expect(canSee(taro, "ci_e_pr_prayerteam")).toBe(false);
    expect(canSee(aoi, "ci_e_pr_prayerteam")).toBe(false);
  });

  it("pastor_only: only owner/pastor (author is taro, so use aoi as the outsider)", () => {
    expect(canSee(jimi, "ci_e_pr_pastoronly")).toBe(true);
    expect(canSee(hana, "ci_e_pr_pastoronly")).toBe(false); // elder
    expect(canSee(ken, "ci_e_pr_pastoronly")).toBe(false); // prayer_team
    expect(canSee(aoi, "ci_e_pr_pastoronly")).toBe(false); // member, not author
    expect(canSee(taro, "ci_e_pr_pastoronly")).toBe(true); // author sees own
  });

  it("group: group members + admins only", () => {
    expect(canSee(aoi, "ci_e_pr_group_young")).toBe(true); // in 青年会
    expect(canSee(yuki, "ci_e_pr_group_young")).toBe(true); // leader of 青年会
    expect(canSee(jimi, "ci_e_pr_group_young")).toBe(true); // admin
    expect(canSee(taro, "ci_e_pr_group_young")).toBe(false); // member, not in group
    expect(canSee(ken, "ci_e_pr_group_young")).toBe(false); // prayer_team, not in group, not admin
  });
});

describe("anonymous_church", () => {
  it("visible to members but author hidden; admins & author see the author", () => {
    const anon = item("ci_e_pr_anon");
    expect(canViewContent(taro, anon, DEMO_NOW)).toBe(true);
    expect(isAuthorVisibleTo(taro, anon)).toBe(false); // normal member: hidden
    expect(isAuthorVisibleTo(jimi, anon)).toBe(true); // admin: visible
    expect(isAuthorVisibleTo(aoi, anon)).toBe(true); // author (aoi) sees own
  });
});

describe("rejected", () => {
  it("never shown to normal members; visible to author & reviewers", () => {
    // author of the rejected item is taro
    expect(canSee(taro, "ci_e_pr_rejected")).toBe(true); // author sees own
    expect(canSee(aoi, "ci_e_pr_rejected")).toBe(false); // other member: never
    expect(canSee(jimi, "ci_e_pr_rejected")).toBe(true); // reviewer
    expect(getPrayerFeed(aoi).some((c) => c.id === "ci_e_pr_rejected")).toBe(false);
  });
});

describe("expiry", () => {
  it("expired disappears from member lists but admins can still view", () => {
    expect(canSee(aoi, "ci_e_pr_expired")).toBe(false);
    expect(getPrayerFeed(aoi).some((c) => c.id === "ci_e_pr_expired")).toBe(false);
    expect(canSee(jimi, "ci_e_pr_expired")).toBe(true); // audit
  });
});

describe("completion logs are private", () => {
  it("only the owner sees their own completion", () => {
    expect(getViewerCompletion(aoi, "ci_e_dev_today")).not.toBeNull();
    expect(getViewerCompletion(ken, "ci_e_dev_today")).toBeNull();
  });
});

describe("moderation permissions", () => {
  it("moderators get the queue; normal members get nothing", () => {
    expect(canModerate(ken)).toBe(true);
    expect(getModerationQueue(ken).length).toBeGreaterThan(0);
    expect(canModerate(taro)).toBe(false);
    expect(getModerationQueue(taro)).toHaveLength(0);
  });

  it("admin area gate: pastor is admin, prayer_team/member are not", () => {
    expect(isChurchAdmin(jimi)).toBe(true);
    expect(isChurchAdmin(ken)).toBe(false);
    expect(isChurchAdmin(taro)).toBe(false);
  });
});
