import { expect, test } from "@playwright/test";

test("admin app exposes a separate login entry point", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/");
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
  await expect(page.getByText("APEX-MATRIX ADMIN")).toBeVisible();
});

test("admin dashboard redirects to login without an authenticated admin", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/dashboard");
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
});
