import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

test("pastoral follow-up request appears in the moderation queue", async ({ page }) => {
  const title = `個別相談のE2E ${Date.now()}`;

  await login(page, "aoi@eifuku.example", "/ja/church/eifuku-minami/prayers/new");

  await page.locator("#pr-title").fill(title);
  await page.locator("#pr-body").fill("牧師に個別に相談したい内容があります。");
  await page.getByRole("button", { name: /牧師のみ/ }).click();
  await page.locator("#pr-consult").click();
  await page.getByRole("button", { name: "確認のために送る" }).click();

  await expect(page.getByText("送信しました")).toBeVisible();

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();

  await login(page, "jimi@eifuku.example", "/ja/admin/eifuku-minami/prayer-requests");

  const card = page.locator("article").filter({ hasText: title }).first();
  await expect(card).toContainText("個別相談の希望があります");
  await expect(card).toContainText("投稿者は牧師との個別の相談を希望しています。");
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
