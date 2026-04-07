import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  expect: { timeout: 25_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    // Free fixed ports so e2e always gets a clean Next + socket (matches dev:reset).
    command:
      "npx --yes kill-port 3000 3001 3002 4000 && npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
