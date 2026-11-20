import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = mode === "production" ? "/re-canvas-door-swing/" : "/";
  const portIndex = process.argv.indexOf("--port");
  const devPort = portIndex >= 0 ? process.argv[portIndex + 1] : "5173";
  const moduleIdsFile = process.env.DOOR_BETA_BUILD_MODULE_IDS_FILE;
  const moduleRecorder: Plugin | undefined = moduleIdsFile
    ? {
        name: "record-beta-build-module-ids",
        generateBundle() {
          writeFileSync(moduleIdsFile, JSON.stringify([...this.getModuleIds()]));
        },
      }
    : undefined;
  return {
    base,
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
