import { defineConfig } from "@playwright/test";

const previewUrl = process.env.DOOR_TEST_URL || "http://127.0.0.1:5173";
const calibrationUrl = process.env.DOOR_CALIBRATION_TEST_URL || "http://127.0.0.1:5177";
const productionUrl = process.env.DOOR_PRODUCTION_TEST_URL || "http://127.0.0.1:4176";

export default defineConfig({
  testDir: ".",
  webServer: [{
    command:
      `npm run dev --workspace retro-horror-door-sample -- --host 127.0.0.1 --port ${new URL(previewUrl).port} --strictPort`,
    env: { VITE_DOOR_TIMING_EDITOR: "false" },
    url: previewUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  }, {
    command:
      `npm run dev:calibration --workspace retro-horror-door-sample -- --host 127.0.0.1 --port ${new URL(calibrationUrl).port} --strictPort`,
    env: { VITE_DOOR_TIMING_EDITOR: "true" },
    url: calibrationUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  }, {
    command:
      `npm run build --workspace retro-horror-door-sample && npm run preview --workspace retro-horror-door-sample -- --host 127.0.0.1 --port ${new URL(productionUrl).port} --strictPort`,
    env: { VITE_DOOR_TIMING_EDITOR: "true" },
    url: `${productionUrl}/re-canvas-door-swing/`,
    reuseExistingServer: false,
    timeout: 120_000,
  }],
  use: {
    baseURL: previewUrl,
    viewport: { width: 1280, height: 720 },
  },
});
