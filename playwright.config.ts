import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
// Credentialed journeys run only against the dedicated disposable backend.
const fixture = process.env.PARITY_UI_CONFIG
  ? JSON.parse(readFileSync(process.env.PARITY_UI_CONFIG, "utf8"))
  : null;
if (
  fixture &&
  (fixture.SUPABASE_URL !== "http://127.0.0.1:55431" ||
    !fixture.UI_TEST_BUYER_EMAIL?.endsWith("@ui-tests.example.test"))
)
  throw Error(
    "Browser journeys require generated disposable-backend fixtures.",
  );
const origin = "http://127.0.0.1:4341";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  forbidOnly: !!process.env.CI,
  reporter: [
    ["list"],
    ["json", { outputFile: ".parity-artifacts/browser-results.json" }],
  ],
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "phone", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4341 --ignore-lock",
    url: origin + "/login",
    reuseExistingServer: false,
    timeout: 120000,
    // Keep the test server in the foreground, separate from any local preview.
    env: {
      ASTRO_DEV_BACKGROUND: "1",
      ...(fixture
        ? {
            SUPABASE_URL: fixture.SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY: fixture.SUPABASE_PUBLISHABLE_KEY,
            SALAM_UI_TEST_BACKEND: "true",
            AUTH_CAPTCHA_ENABLED: "false",
            SITE_URL: origin,
          }
        : {}),
    },
  },
});
