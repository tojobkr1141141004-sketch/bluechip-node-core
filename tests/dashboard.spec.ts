import { expect, test } from "@playwright/test";

test("root enters the protected APEX-MATRIX user area", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "회원 로그인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
});

test("protected dashboard shows the user login boundary", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "회원 로그인" })).toBeVisible();
});

test("protected financial and mining routes share the same login boundary", async ({ page }) => {
  const routes = [
    "/dashboard/mining",
    "/dashboard/assets",
    "/dashboard/deposit",
    "/dashboard/withdrawal",
    "/dashboard/history",
    "/dashboard/profile",
    "/dashboard/security"
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "회원 로그인" })).toBeVisible();
  }
});

test("health endpoint is available", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "bluechip-node-core"
  });
});
