import { expect, test } from "@playwright/test";

test("deposit page is protected", async ({ page }) => {
  await page.goto("/dashboard/deposit");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("withdrawal page is protected", async ({ page }) => {
  await page.goto("/dashboard/withdrawal");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("admin finance page is protected", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/finance");
  await expect(page.getByRole("heading", { name: "운영자 로그인" })).toBeVisible();
});
