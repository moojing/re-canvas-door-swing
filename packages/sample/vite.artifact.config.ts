import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// 單檔 demo 打包設定:所有資產內嵌成 data URI,產出單一 JS + CSS,
// 再手動(或由外部腳本)合併成單檔 HTML,供無法起 server 的環境預覽 POC。
// 用法:npx vite build --config vite.artifact.config.ts
export default defineConfig({
  base: "",
  assetsInclude: ["**/*.glb"],
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // 指向 library 原始碼讓 rollup 逐模組 tree-shake:
      // dist 是單檔 chunk,引任何 export 都會拖進未使用的 glb/mp3 data URI
      "door-entrance": path.resolve(__dirname, "../door-lib/src/index.ts"),
    },
  },
  build: {
    outDir: "dist-artifact",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, "artifact.html"),
    },
  },
});
