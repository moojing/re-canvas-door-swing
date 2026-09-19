import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  webServer: {
    command:
      "npm run dev --workspace retro-horror-door-sample -- --host 127.0.0.1",
    url: process.env.DOOR_TEST_URL || "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.DOOR_TEST_URL || "http://127.0.0.1:5173",
    viewport: { width: 1280, height: 720 },
  },
});
