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
    expect(
      screen.getByText(
        "今日以降の日付を選べます。公開時刻は教会の朝の配信時刻です（配信時刻を過ぎた当日ぶんはすぐに公開されます）。",
      ),
    ).toBeInTheDocument();
  });

  it("enables scheduled publishing for today or later", async () => {
    renderForm();

    const scheduleInput = screen.getByLabelText("公開予約日") as HTMLInputElement;
    const scheduleButton = screen.getByRole("button", { name: "予約する" });

    // 最小日は今日（Asia/Tokyo）。当日ぶんの予約も許可する。
    expect(scheduleInput.min).toBe("2026-07-04");
    expect(scheduleButton).toBeDisabled(); // 未入力のうちは無効

    // 過去日は不可（早すぎるエラー）。
    fireEvent.input(scheduleInput, { target: { value: "2026-07-03" } });
    expect(screen.getByText("予約配信は今日以降の日付を選んでください。")).toBeInTheDocument();
    expect(scheduleButton).toBeDisabled();

    // 当日は許可する。
    fireEvent.input(scheduleInput, { target: { value: "2026-07-04" } });
    expect(scheduleButton).toBeEnabled();

    fireEvent.click(scheduleButton);

    await waitFor(() => {
      expect(saveDevotion).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "scheduled",
          scheduledAt: "2026-07-04",
        }),
      );
    });
  });
});
