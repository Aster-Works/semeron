import { describe, expect, it } from "vitest";
import {
  DELETED_ACCOUNT_DISPLAY_NAME,
  getAccountMembershipRoles,
  requiresAnotherActiveOwner,
  wouldDeleteLastOwner,
  type AccountDeletionMembershipRow,
} from "@/app/lib/db/accountDeletion";

const membership = (
  status: string,
  roles: Array<string | null>,
): AccountDeletionMembershipRow => ({
  id: "membership-1",
  church_id: "church-1",
  status,
  membership_roles: roles.map((role) => ({ role })),
});

describe("account deletion policy", () => {
  it("only active owner memberships require another active owner", () => {
    expect(requiresAnotherActiveOwner(membership("active", ["owner"]))).toBe(true);
    expect(requiresAnotherActiveOwner(membership("inactive", ["owner"]))).toBe(false);
    expect(requiresAnotherActiveOwner(membership("removed", ["owner"]))).toBe(false);
    expect(requiresAnotherActiveOwner(membership("active", ["pastor", "member"]))).toBe(false);
  });

  it("blocks deleting the last active owner", () => {
    const owner = membership("active", ["owner", "pastor"]);

    expect(wouldDeleteLastOwner(owner, 0)).toBe(true);
    expect(wouldDeleteLastOwner(owner, null)).toBe(true);
    expect(wouldDeleteLastOwner(owner, 1)).toBe(false);
  });

  it("does not block non-active or non-owner memberships", () => {
    expect(wouldDeleteLastOwner(membership("inactive", ["owner"]), 0)).toBe(false);
    expect(wouldDeleteLastOwner(membership("active", ["elder"]), 0)).toBe(false);
  });

  it("normalizes role rows and keeps the anonymized display name stable", () => {
    expect(getAccountMembershipRoles(membership("active", ["owner", null, "pastor"]))).toEqual([
      "owner",
      "pastor",
    ]);
    expect(DELETED_ACCOUNT_DISPLAY_NAME).toBe("Deleted account");
  });
});
