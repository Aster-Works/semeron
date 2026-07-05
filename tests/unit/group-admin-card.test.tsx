import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupAdminCard, type GroupAdminVM } from "@/app/components/admin/GroupAdminCard";
import { deleteGroup } from "@/app/lib/db/actions";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/app/lib/db/actions", () => ({
  addGroupMember: vi.fn(async () => ({ ok: true })),
  deleteGroup: vi.fn(async () => ({ ok: true })),
  removeGroupMember: vi.fn(async () => ({ ok: true })),
  setGroupArchived: vi.fn(async () => ({ ok: true })),
  setGroupLeader: vi.fn(async () => ({ ok: true })),
}));

const baseGroup: GroupAdminVM = {
  id: "group_1",
  name: "火曜祈り会",
  description: "",
  archived: false,
  leaderMembershipId: null,
  members: [],
};

function renderCard(group: GroupAdminVM = baseGroup) {
  return render(
    <GroupAdminCard
      locale="ja"
      churchId="church_1"
      churchSlug="eifuku-minami"
      group={group}
      allMembers={[]}
    />,
  );
}

describe("GroupAdminCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deletes a group after confirmation", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteGroup).toHaveBeenCalledWith({
        churchId: "church_1",
        churchSlug: "eifuku-minami",
        locale: "ja",
        groupId: "group_1",
      });
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });

  it("shows a specific error when the group has content history", async () => {
    vi.mocked(deleteGroup).mockResolvedValueOnce({ ok: false, error: "group has content" });
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    expect(await screen.findByText("このグループには祈祷課題などの履歴があるため削除できません。アーカイブしてください。"))
      .toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
