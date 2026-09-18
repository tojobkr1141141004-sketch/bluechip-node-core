import { expect, test } from "@playwright/test";

test("admin notification center requires authentication", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/notifications");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("admin dashboard remains protected after notification shell integration", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
