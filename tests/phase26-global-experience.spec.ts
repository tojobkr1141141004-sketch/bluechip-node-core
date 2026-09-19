import { expect, test } from "@playwright/test";

test("Japanese locale keeps its URL and renders Japanese authentication copy", async ({ page }) => {
  await page.goto("/ja/login");
  await expect(page).toHaveURL(/\/ja\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  await expect(page.getByLabel("Language")).toHaveValue("ja");
});

test("English locale keeps its URL and renders English authentication copy", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Language")).toHaveValue("en");
});

test("unprefixed dashboard requests are redirected to a supported locale", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/(ko|ja|en)\/login(?:\?|$)/);
});
