import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/vanilla.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Assets are copied into dist/ and the import statements are preserved in
  // the output, so the consumer's bundler resolves them to final URLs
  // (see docs/technical-debt/door-texture-asset-ownership.md).
  loader: {
    ".png": "copy",
    ".mp3": "copy",
    ".glb": "copy",
  },
});
