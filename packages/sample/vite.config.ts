import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/re-canvas-door-swing/" : "/",
  // retro-horror-door ships .glb handle models as bundler-imported assets
  assetsInclude: ["**/*.glb"],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "retro-horror-door": path.resolve(__dirname, "../door-lib/src/index.ts"),
    },
  },
}));
