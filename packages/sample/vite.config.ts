import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = mode === "production" ? "/re-canvas-door-swing/" : "/";
  const moduleIdsFile = process.env.DOOR_BETA_BUILD_MODULE_IDS_FILE;
  const moduleRecorder: Plugin | undefined = moduleIdsFile
    ? {
        name: "record-beta-build-module-ids",
        generateBundle() {
          writeFileSync(moduleIdsFile, JSON.stringify([...this.getModuleIds()]));
        },
      }
    : undefined;
  const portArgument = process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1]
    ?? process.argv[process.argv.indexOf("--port") + 1];
  const devPort = /^\d+$/.test(portArgument ?? "") ? portArgument : "5173";
  return {
    base,
    // Preview and calibration/test servers must not overwrite each other's
    // optimized dependency chunks while an existing browser tab is using them.
    cacheDir: path.resolve(__dirname, `node_modules/.vite/${mode}-${devPort}`),
    assetsInclude: ["**/*.glb"],
    server: {
      host: "127.0.0.1",
      port: 5173,
    },
    plugins: [
      react(),
      ...(moduleRecorder ? [moduleRecorder] : []),
    ],
    resolve: {
      conditions: env.VITE_DOOR_ASSET_MODE === "cdn" ? ["module", "browser"] : ["module", "browser", "door-local"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "retro-horror-door": process.env.DOOR_PACKAGE_ENTRY || path.resolve(__dirname, "../door-lib/src/index.ts"),
      },
    },
  };
});
