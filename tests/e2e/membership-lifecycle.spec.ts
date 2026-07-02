import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";
const EIFUKU_MEMBERS = "/ja/admin/eifuku-minami/members";

const ids = {
  aoi: "c1000000-0000-0000-0000-0000000000e5",
  yuki: "c1000000-0000-0000-0000-0000000000e4",
} as const;

test.describe.configure({ mode: "serial" });

test.describe("membership lifecycle", () => {
  test("admin can suspend and restore a member", async ({ page }) => {
    await login(page, "jimi@eifuku.example", EIFUKU_MEMBERS);

    const aoi = memberRow(page, ids.aoi);
    await expect(aoi).toContainText("田中 あおい");
    await aoi.getByTestId(`member-status-${ids.aoi}`).click();
    await page.getByTestId("member-status-confirm").click();
    await expect(memberRow(page, ids.aoi)).toHaveCount(0);

    await page.goto(`${EIFUKU_MEMBERS}?status=inactive`);
    await expect(memberRow(page, ids.aoi)).toContainText("田中 あおい");
    await memberRow(page, ids.aoi).getByTestId(`member-status-${ids.aoi}`).click();
    await page.getByTestId("member-status-confirm").click();
    await expect(memberRow(page, ids.aoi)).toHaveCount(0);

    await page.goto(EIFUKU_MEMBERS);
    await expect(memberRow(page, ids.aoi)).toContainText("田中 あおい");
  });

  test("admin can remove a member from the church", async ({ page }) => {
    await login(page, "jimi@eifuku.example", EIFUKU_MEMBERS);

    const yuki = memberRow(page, ids.yuki);
    await expect(yuki).toContainText("森 ゆき");
    await yuki.getByTestId(`member-remove-${ids.yuki}`).click();
    await page.getByTestId("member-remove-confirm").click();
    await expect(memberRow(page, ids.yuki)).toHaveCount(0);

    await page.goto(`${EIFUKU_MEMBERS}?status=removed`);
    await expect(memberRow(page, ids.yuki)).toContainText("森 ゆき");
    await expect(memberRow(page, ids.yuki).getByTestId(`member-remove-${ids.yuki}`)).toHaveCount(0);
  });

  test("member can leave church and loses church access", async ({ page }) => {
    await login(page, "aoi@eifuku.example", "/ja/church/eifuku-minami/me");

    await page.getByTestId("leave-church-button").click();
    await page.getByTestId("leave-church-confirm").click();
    await expect(page).toHaveURL(/\/ja\/onboarding$/);

    await page.goto("/ja/church/eifuku-minami/today");
    await expect(page).toHaveURL(/\/ja\/onboarding$/);
  });

  test("last active owner cannot delete their account", async ({ page }) => {
    await login(page, "david@grace.example", "/en/church/grace-community/me", "en");

    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-account-confirm-input").fill("DELETE");
    await page.getByTestId("delete-account-confirm").click();

    await expect(page.getByText("You are the last owner of a church.")).toBeVisible();
    await expect(page).toHaveURL(/\/en\/church\/grace-community\/me$/);
  });

  test("non-owner can delete account and cannot sign in again", async ({ page }) => {
    await login(page, "taro@eifuku.example", "/ja/church/eifuku-minami/me");

    await page.getByTestId("delete-account-button").click();
    await page.getByTestId("delete-account-confirm-input").fill("DELETE");
    await page.getByTestId("delete-account-confirm").click();
    await expect(page).toHaveURL(/\/ja\/login$/);

    await page.locator("#email").fill("taro@eifuku.example");
    await page.locator("#password").fill(PASSWORD);
    await page.getByTestId("auth-submit").click();
    await expect(page.getByText("メールまたはパスワードが正しくありません。")).toBeVisible();
  });
});

async function login(
  page: Page,
  email: string,
  nextPath: string,
  locale: "ja" | "en" = "ja",
) {
  await page.goto(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
  await expect(page.getByTestId("auth-form")).toHaveAttribute("data-ready", "true");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(nextPath)}$`));
}

function memberRow(page: Page, membershipId: string) {
  return page.getByTestId(`member-row-${membershipId}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
