import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["line"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    locale: "ko-KR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 15"] } }
  ],
  webServer: [
    {
      command: "pnpm --filter @apex-matrix/web exec next start --hostname 127.0.0.1 --port 3000",
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NODE_ENV: "production" }
    },
    {
      command: "pnpm --filter @apex-matrix/admin exec next start --hostname 127.0.0.1 --port 3001",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
