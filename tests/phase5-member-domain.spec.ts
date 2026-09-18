import { expect, test } from "@playwright/test";

test("user profile stays protected", async ({ page }) => {
  await page.goto("/dashboard/profile");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "회원 로그인" })).toBeVisible();
});

test("admin member management stays protected", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/members");
  await expect(page.getByRole("heading", { name: "운영자 로그인" })).toBeVisible();
});
