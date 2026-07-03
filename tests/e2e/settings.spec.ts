import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

test("owner can persist content languages", async ({ page }) => {
  await login(page, "jimi@eifuku.example", "/ja/admin/eifuku-minami/settings");

  await page.getByTestId("content-language-select").selectOption("en");
  await page.getByTestId("content-language-save").click();

  await expect(page.getByText("保存しました。")).toBeVisible();
  await page.reload();
  await expect(page.getByText("現在: 日本語 · English")).toBeVisible();
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
