import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

test("owner can persist content languages", async ({ page }) => {
  await login(page, "jimi@eifuku.example", "/ja/admin/eifuku-minami/settings");

  const languageSelect = page.getByTestId("content-language-select");
  const available = await languageSelect.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  if (available.includes("en")) {
    await languageSelect.selectOption("en");
    await page.getByTestId("content-language-save").click();
    await expect(page.getByText("保存しました。")).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText("現在: 日本語 · English")).toBeVisible();
});

test("owner can update morning notification time", async ({ page }) => {
  await login(page, "jimi@eifuku.example", "/ja/admin/eifuku-minami/settings");

  await page.getByTestId("church-morning-time").fill("07:15");
  await page.getByTestId("church-basics-save").click();

  await expect(page.getByText("保存しました。")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("church-morning-time")).toHaveValue("07:15");
});

test("owner can rotate an invite code and see the audit log", async ({ page }) => {
  await login(page, "jimi@eifuku.example", "/ja/admin/eifuku-minami/settings");

  const before = (await page.getByTestId("invite-code").innerText()).trim();
  await page.getByTestId("invite-rotate-open").click();
  await page.getByTestId("invite-confirm").click();

  await expect(page.getByTestId("invite-code")).not.toHaveText(before);
  await expect(page.getByTestId("invite-status")).toHaveText("有効");

  await page.goto("/ja/admin/eifuku-minami/audit");
  await expect(page.getByRole("heading", { name: "監査ログ" })).toBeVisible();
  await expect(page.getByText("招待コード再発行").first()).toBeVisible();
});

async function login(page: Page, email: string, nextPath: string) {
  await page.goto(`/ja/login?next=${encodeURIComponent(nextPath)}`);
  await expect(page.getByTestId("auth-form")).toHaveAttribute("data-ready", "true");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(nextPath)}$`));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
