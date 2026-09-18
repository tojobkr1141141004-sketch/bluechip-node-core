import { expect, test } from "@playwright/test";

test("admin app boots as a separate application", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/");
  await expect(page.getByRole("heading", { name: "Admin Foundation" })).toBeVisible();
  await expect(page.getByText("APEX-MATRIX")).toBeVisible();
});
