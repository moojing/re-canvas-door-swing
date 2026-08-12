import { defineConfig } from "tsup";

const sharedOptions = {
  format: ["esm", "cjs"] as const,
  dts: true,
  sourcemap: true,
  // Assets are copied into dist/ and the import statements are preserved in
  // the output, so the consumer's bundler resolves them to final URLs
  // (see docs/technical-debt/door-texture-asset-ownership.md).
  loader: {
    ".png": "copy",
    ".mp3": "copy",
    ".glb": "copy",
  },
};

export default defineConfig([
  {
    ...sharedOptions,
    entry: ["src/index.ts"],
    clean: true,
  },
  {
    ...sharedOptions,
    entry: ["src/vanilla.ts"],
    clean: false,
  },
  {
    ...sharedOptions,
    entry: ["src/react.ts"],
    clean: false,
  },
]);
