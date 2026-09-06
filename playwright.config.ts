import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3128/aircraft-fuel-system-lab/",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined,
    },
  },
  reporter: "list",
  webServer: {
    command: "python3 tests/static_server.py",
    url: "http://127.0.0.1:3128/aircraft-fuel-system-lab/",
    reuseExistingServer: !process.env.CI,
  },
});
