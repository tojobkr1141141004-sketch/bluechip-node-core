import { expect, test } from "@playwright/test";

test("admin dashboard requires recent authenticated admin session", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("admin reauthentication message is rendered", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/login?error=reauth");
  await expect(page.getByText("보안상 다시 로그인해야 합니다.")).toBeVisible();
});

test("user security settings require authentication", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/dashboard/security");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("user signup shows strong password requirements", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByRole("button", { name: "새 계정 만들기" }).click();
  await expect(page.getByText("가입 비밀번호는 12자 이상이며 대문자·소문자·숫자·특수문자를 각각 포함해야 합니다.")).toBeVisible();
});
