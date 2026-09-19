import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = mode === "production" ? "/re-canvas-door-swing/" : "/";
  return {
    base,
    assetsInclude: ["**/*.glb"],
    server: {
      host: "127.0.0.1",
      port: 5173,
    },
    plugins: [
      react(),
      ...(process.env.DOOR_BETA_BUILD_MODULE_IDS_FILE
        ? [{
            name: "record-beta-build-module-ids",
            generateBundle() {
              writeFileSync(
                process.env.DOOR_BETA_BUILD_MODULE_IDS_FILE,
                JSON.stringify([...this.getModuleIds()])
              );
            },
          }]
        : []),
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
