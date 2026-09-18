import { expect, test } from "@playwright/test";

test("protected user dashboard redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "회원 로그인" })).toBeVisible();
});

test("protected user sub-route keeps the authenticated shell boundary", async ({ page }) => {
  await page.goto("/dashboard/mining");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test("protected admin sub-route redirects to admin login", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard/members");
  await expect(page.getByRole("heading", { name: "운영자 로그인" })).toBeVisible();
  await expect(page.getByText(/활성 운영자 계정/)).toBeVisible();
});
