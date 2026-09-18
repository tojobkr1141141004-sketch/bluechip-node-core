import { defineConfig, devices } from "@playwright/test";

const reuseExistingServer = !process.env.CI;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["line"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm dev:web",
      url: "http://127.0.0.1:3000",
      reuseExistingServer,
      timeout: 120_000
    },
    {
      command: "pnpm dev:admin",
      url: "http://127.0.0.1:3001",
      reuseExistingServer,
      timeout: 120_000
    }
  ]
});
