import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Keep it sequential to avoid file conflicts
  reporter: [
    ["list"], // Clean list reporter with step-by-step updates
    ["html", { outputFolder: "e2e/report", open: "never" }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "E2E_GARDEN_RESET=1 RESOURCES_PATH=/tmp/vw-e2e-resources.json npm run dev",
    url: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      E2E_GARDEN_RESET: "1",
      RESOURCES_PATH: "/tmp/vw-e2e-resources.json",
    },
  },
});
