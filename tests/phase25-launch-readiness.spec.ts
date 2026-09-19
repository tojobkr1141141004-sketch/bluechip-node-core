import { expect, test } from "@playwright/test";

test("launch readiness is protected by the admin session boundary", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/launch-readiness");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "운영자 로그인" })).toBeVisible();
});
