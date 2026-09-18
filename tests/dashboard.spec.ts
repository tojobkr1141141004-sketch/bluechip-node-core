import { expect, test } from "@playwright/test";

test("dashboard loads with primary navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /전 세계 노드/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "지구본 노드" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Next 16.3")).toBeVisible();
});

test("dashboard navigation works", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "자산 건강" }).click();
  await expect(page.getByRole("heading", { name: "자산 건강" })).toBeVisible();

  await page.getByRole("button", { name: "안심 금고" }).click();
  await expect(page.getByRole("heading", { name: /안심 금고/ })).toBeVisible();

  await page.getByRole("button", { name: "다음 단계" }).click();
  await expect(page.getByText("확인")).toBeVisible();
});

test("health endpoint is available", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "bluechip-node-core"
  });
});
