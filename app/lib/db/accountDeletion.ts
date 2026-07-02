export const DELETED_ACCOUNT_DISPLAY_NAME = "Deleted account";

export type AccountDeletionMembershipRow = {
  id: string;
  church_id: string;
  status: string;
  membership_roles?: { role: string | null }[] | null;
};

export function getAccountMembershipRoles(membership: AccountDeletionMembershipRow): string[] {
  return (membership.membership_roles ?? [])
    .map((roleRow) => roleRow.role)
    .filter((role): role is string => Boolean(role));
}

export function requiresAnotherActiveOwner(membership: AccountDeletionMembershipRow): boolean {
  return membership.status === "active" && getAccountMembershipRoles(membership).includes("owner");
}

export function wouldDeleteLastOwner(
  membership: AccountDeletionMembershipRow,
  otherActiveOwnerCount: number | null | undefined,
): boolean {
  return requiresAnotherActiveOwner(membership) && (!otherActiveOwnerCount || otherActiveOwnerCount === 0);
}
