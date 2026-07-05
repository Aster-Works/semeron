import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteLinkCard } from "@/app/components/admin/InviteLinkCard";
import { expireInviteCode, rotateInviteCode } from "@/app/lib/db/actions";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/app/lib/db/actions", () => ({
  expireInviteCode: vi.fn(async () => ({ ok: true })),
  rotateInviteCode: vi.fn(async () => ({ ok: true })),
}));

const baseProps = {
  locale: "ja" as const,
  churchId: "church_1",
  churchSlug: "eifuku-minami",
  inviteCode: "EIFUKU-2026",
  inviteCodeExpiresAt: "2099-01-01T00:00:00.000Z",
  inviteCodeRotatedAt: "2026-07-05T00:00:00.000Z",
  inviteCodeExpired: false,
  canEdit: true,
};

describe("InviteLinkCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("rotates the invite code after confirmation", async () => {
    render(<InviteLinkCard {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "新しいコードを発行" }));
    fireEvent.click(screen.getByRole("button", { name: "発行する" }));

    await waitFor(() => {
      expect(rotateInviteCode).toHaveBeenCalledWith({
        churchId: "church_1",
        churchSlug: "eifuku-minami",
        locale: "ja",
      });
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });

  it("expires the invite code after confirmation", async () => {
    render(<InviteLinkCard {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "今のコードを失効" }));
    fireEvent.click(screen.getByRole("button", { name: "失効する" }));

    await waitFor(() => {
      expect(expireInviteCode).toHaveBeenCalledWith({
        churchId: "church_1",
        churchSlug: "eifuku-minami",
        locale: "ja",
      });
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });

  it("does not allow copying or expiring an expired invite code", () => {
    render(
      <InviteLinkCard
        {...baseProps}
        inviteCodeExpiresAt="2020-01-01T00:00:00.000Z"
        inviteCodeExpired
      />,
    );

    expect(screen.getByText("失効済み")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "コードをコピー" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "招待リンクをコピー" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "今のコードを失効" })).toBeDisabled();
  });
});
