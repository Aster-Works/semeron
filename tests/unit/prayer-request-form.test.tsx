import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrayerRequestForm } from "@/app/components/member/PrayerRequestForm";
import { LocaleProvider } from "@/app/lib/i18n/LocaleProvider";
import { submitPrayerRequest } from "@/app/lib/db/actions";

vi.mock("@/app/lib/db/actions", () => ({
  submitPrayerRequest: vi.fn(async () => ({ ok: true })),
}));

function renderForm() {
  return render(
    <LocaleProvider locale="ja">
      <PrayerRequestForm
        locale="ja"
        churchId="church_1"
        churchSlug="eifuku-minami"
        churchDefaultLocale="ja"
        groups={[]}
      />
    </LocaleProvider>,
  );
}

describe("PrayerRequestForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("sends the pastoral follow-up request to the server action", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "個別に相談したいこと" },
    });
    fireEvent.change(screen.getByLabelText(/祈ってほしいこと/), {
      target: { value: "牧師に直接相談したい内容があります。" },
    });
    fireEvent.click(screen.getByRole("button", { name: /牧師のみ/ }));
    fireEvent.click(screen.getByRole("switch", { name: "牧師に個別に相談したい" }));
    fireEvent.click(screen.getByRole("button", { name: "確認のために送る" }));

    await waitFor(() => {
      expect(submitPrayerRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          pastorConsult: true,
          visibility: "pastor_only",
        }),
      );
    });
  });
});
