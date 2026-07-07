import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChurchBasicsEditor } from "@/app/components/admin/ChurchBasicsEditor";
import { updateChurchSettings } from "@/app/lib/db/actions";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/app/lib/db/actions", () => ({
  updateChurchSettings: vi.fn(async () => ({ ok: true })),
}));

const baseProps = {
  locale: "ja" as const,
  churchId: "church_1",
  churchSlug: "eifuku-minami",
  canEdit: true,
  initial: {
    name: { ja: "永福南キリスト教会", en: "Eifuku Minami Christ Church" },
    defaultLocale: "ja" as const,
    timezone: "Asia/Tokyo",
    morningNotificationTime: "06:30",
    plan: "standard" as const,
  },
};

describe("ChurchBasicsEditor", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("saves an updated morning notification time", async () => {
    render(<ChurchBasicsEditor {...baseProps} />);

    fireEvent.change(screen.getByTestId("church-morning-time"), { target: { value: "07:15" } });
    fireEvent.click(screen.getByTestId("church-basics-save"));

    await waitFor(() => {
      expect(updateChurchSettings).toHaveBeenCalledWith({
        churchId: "church_1",
        churchSlug: "eifuku-minami",
        locale: "ja",
        churchName: "永福南キリスト教会",
        churchNameLocale: "ja",
        timezone: "Asia/Tokyo",
        morningNotificationTime: "07:15",
      });
      expect(mocks.refresh).toHaveBeenCalled();
    });
    expect(screen.getByText("保存しました。")).toBeInTheDocument();
  });

  it("keeps editable controls disabled for non owner/pastor users", () => {
    render(<ChurchBasicsEditor {...baseProps} canEdit={false} />);

    expect(screen.getByTestId("church-morning-time")).toBeDisabled();
    expect(screen.queryByTestId("church-basics-save")).not.toBeInTheDocument();
    expect(screen.getByText("この設定は owner / pastor が変更できます。")).toBeInTheDocument();
  });
});
