import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";
const CHURCH = "/ja/church/eifuku-minami";

test("member can leave Today for every tab without getting stuck on the skeleton", async ({ page }) => {
  await login(page, "aoi@eifuku.example", `${CHURCH}/today`);

  for (const target of ["prayers", "groups", "inbox", "me"]) {
    await page.goto(`${CHURCH}/today`);
    await expect(page).toHaveURL(new RegExp(`${CHURCH}/today$`));

    await page.locator(`nav[aria-label="メインナビ"] a[href$="/${target}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${CHURCH}/${target}$`));
    await expect(page.locator('[role="presentation"][aria-hidden="true"]')).toHaveCount(0);
  }
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
