import { expect, test } from "@playwright/test";

test("user asset and ledger history pages stay protected", async ({ page }) => {
  await page.goto("/dashboard/assets");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);

  await page.goto("/dashboard/history");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("admin finance page stays protected", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/finance");
  await expect(page.getByRole("heading", { name: "운영자 로그인" })).toBeVisible();
});
