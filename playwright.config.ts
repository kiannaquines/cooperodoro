import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4173", trace: "on-first-retry" },
  webServer: { command: "VITE_E2E_AUTH_BYPASS=true npm run build && npm run preview -- --host 127.0.0.1", port: 4173, reuseExistingServer: false },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
