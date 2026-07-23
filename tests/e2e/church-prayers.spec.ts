import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

test("owner posts a church-official prayer; members see it in its own section", async ({ page }) => {
  const title = `教会公式のE2E ${Date.now()}`;

  // オーナー（jimi）が管理画面から教会公式の祈祷課題を投稿（即時公開）
  await login(page, "jimi@eifuku.example", "/ja/admin/eifuku-minami/prayer-requests");
  await page.locator("#church-prayer-title").fill(title);
  await page.locator("#church-prayer-body").fill("特別伝道礼拝の祝福のために覚えて祈りましょう。");
  await page.getByRole("button", { name: "公開する" }).click();
  await expect(page.getByText("公開しました。")).toBeVisible();

  // 会員（aoi）には「教会の祈り」別枠に教会名義で表示される
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  await login(page, "aoi@eifuku.example", "/ja/church/eifuku-minami/prayers");

  await expect(page.getByRole("heading", { name: "教会の祈り" })).toBeVisible();
  const card = page.locator("article").filter({ hasText: title }).first();
  await expect(card).toContainText("永福南キリスト教会"); // 個人名でなく教会名義
  await expect(card).toContainText("教会全体");
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
