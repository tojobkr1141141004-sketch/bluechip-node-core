import { expect, test } from "@playwright/test";

test("admin app exposes a separate login entry point", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/");
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
  await expect(page.getByText("APEX-MATRIX ADMIN")).toBeVisible();
});

test("admin dashboard redirects to login without an authenticated admin", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard");
  await expect(page.getByRole("heading", { name: "운영자 로그인" })).toBeVisible();
  await expect(page.getByText(/활성 운영자 계정/)).toBeVisible();
});

test("admin health endpoint is available", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3001/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "bluechip-node-core-admin"
  });
});
