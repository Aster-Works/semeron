import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

test("service worker does not cache authenticated HTML pages", async ({ page }) => {
  await login(page, "jimi@eifuku.example", "/ja/admin/eifuku-minami/members");

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await Promise.race([
        new Promise((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
        }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
  });

  const cachedUrls = await page.evaluate(async () => {
    await fetch("/ja/admin/eifuku-minami/members", { credentials: "include" });
    await fetch("/ja/church/eifuku-minami/prayers", { credentials: "include" });
    await fetch("/ja/church/eifuku-minami/inbox", { credentials: "include" });

    const urls: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) urls.push(request.url);
    }
    return urls;
  });

  const cachedPaths = cachedUrls.map((url) => new URL(url).pathname);
  expect(cachedPaths).not.toContain("/ja/admin/eifuku-minami/members");
  expect(cachedPaths).not.toContain("/ja/church/eifuku-minami/prayers");
  expect(cachedPaths).not.toContain("/ja/church/eifuku-minami/inbox");
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
