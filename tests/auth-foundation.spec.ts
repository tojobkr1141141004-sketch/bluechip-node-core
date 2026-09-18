import { expect, test } from "@playwright/test";

test("user app exposes login and signup", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "회원 로그인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  await page.getByRole("button", { name: "새 계정 만들기" }).click();
  await expect(page.getByRole("button", { name: "회원가입" })).toBeVisible();
});

test("protected user account redirects to login when no session is configured", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "회원 로그인" })).toBeVisible();
});
