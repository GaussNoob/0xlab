import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Monaco and the WebGL labs are intentionally heavy; keep local browser
  // concurrency below the point where Edge starts discarding renderers.
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    ...(executablePath ? { launchOptions: { executablePath } } : {})
  },
  ...(externalBaseUrl ? {} : {
    webServer: {
      command: "npm run dev",
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  }),
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ]
});
