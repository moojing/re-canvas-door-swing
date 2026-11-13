import { defineConfig } from "@playwright/test";
import path from "node:path";
import { realpathSync } from "node:fs";
import { repositoryRoot } from "./timeline.ts";

const sourceRoot = realpathSync(process.env.ANIMATION_REFERENCE_ROOT || repositoryRoot);
const port = Number(process.env.ANIMATION_TEST_PORT || 5192);
export default defineConfig({
  testDir: ".",
  testMatch: ["visual.test.ts", "asset-readiness.test.ts"],
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  updateSnapshots: "none",
  snapshotPathTemplate: "{testDir}/baseline/{arg}{ext}",
  outputDir: path.join(repositoryRoot, "packages/door-lib/test-results/animation-regression"),
  reporter: [["list"], ["html", { outputFolder: path.join(repositoryRoot, "packages/door-lib/test-results/animation-report"), open: "never" }]],
  use: {
    browserName: "chromium", baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 1,
    colorScheme: "light", reducedMotion: "reduce", locale: "en-US", timezoneId: "UTC",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--force-color-profile=srgb"] },
  },
  expect: { toMatchSnapshot: { threshold: 0.1, maxDiffPixels: 0 } },
  webServer: {
    command: `npm run dev --workspace retro-horror-door-sample -- --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: sourceRoot, env: { VITE_DOOR_TIMING_EDITOR: "false", VITE_DOOR_ASSET_MODE: "local",
      DOOR_PACKAGE_ENTRY: path.join(sourceRoot, "packages/door-lib/src/index.ts"), NODE_OPTIONS: "", NODE_PATH: "" },
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 120000,
  },
});
