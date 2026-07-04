import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevotionForm } from "@/app/components/admin/DevotionForm";
import { LocaleProvider } from "@/app/lib/i18n/LocaleProvider";
import { saveDevotion } from "@/app/lib/db/actions";

vi.mock("@/app/lib/db/actions", () => ({
  saveDevotion: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/app/components/admin/PastorAssistPanel", () => ({
  PastorAssistPanel: () => <div data-testid="pastor-assist-panel" />,
}));

function renderForm() {
  return render(
    <LocaleProvider locale="ja">
      <DevotionForm
        locale="ja"
        churchId="church_1"
        churchSlug="eifuku-minami"
        churchTimezone="Asia/Tokyo"
        contentLanguages={["ja"]}
      />
    </LocaleProvider>,
  );
}

describe("DevotionForm scheduling", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-07-04T03:00:00.000Z").getTime());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("separates the Today display date from the scheduled publish date", () => {
    renderForm();

    expect(screen.getByLabelText("Todayに表示する日")).toBeInTheDocument();
    expect(screen.getByText("この日付のTodayに会員へ表示されます。")).toBeInTheDocument();
    expect(screen.getByLabelText("公開予約日")).toBeInTheDocument();
    expect(screen.getByText("予約する場合は明日以降を選んでください。公開時刻は教会の朝の配信時刻です。")).toBeInTheDocument();
  });

  it("only enables scheduled publishing for tomorrow or later", async () => {
    renderForm();

    const scheduleInput = screen.getByLabelText("公開予約日") as HTMLInputElement;
    const scheduleButton = screen.getByRole("button", { name: "予約する" });

    expect(scheduleInput.min).toBe("2026-07-05");
    expect(scheduleButton).toBeDisabled();

    fireEvent.input(scheduleInput, { target: { value: "2026-07-04" } });
    expect(screen.getByText("予約配信は明日以降の日付を選んでください。")).toBeInTheDocument();
    expect(scheduleButton).toBeDisabled();

    fireEvent.input(scheduleInput, { target: { value: "2026-07-05" } });
    expect(scheduleButton).toBeEnabled();

    fireEvent.click(scheduleButton);

    await waitFor(() => {
      expect(saveDevotion).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "scheduled",
          scheduledAt: "2026-07-05",
        }),
      );
    });
  });
});
