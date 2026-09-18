import { expect, test } from "@playwright/test";

test("admin operations center requires authentication", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("admin audit page requires authentication", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/audit");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("user cannot enter admin operations center", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});