import { test, expect } from "@playwright/test";

test.describe("PHASE 22 USER 알림", () => {
  test("알림센터는 로그인 없이 접근할 수 없다", async ({ page }) => {
    await page.goto("/dashboard/notifications");
    await expect(page).toHaveURL(/\/login\?next=\/dashboard/);
  });
});
