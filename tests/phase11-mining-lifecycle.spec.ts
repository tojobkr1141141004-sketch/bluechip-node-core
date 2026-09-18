import { expect, test } from "@playwright/test";

test("user mining lifecycle page remains protected", async ({ page }) => {
  await page.goto("/dashboard/mining");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("admin mining lifecycle console remains protected", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/mining");
  await expect(page.getByRole("heading", { name: "운영자 로그인" })).toBeVisible();
});
