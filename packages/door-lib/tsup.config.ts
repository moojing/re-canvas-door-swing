import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

const copyModelAttribution = async () => {
  const distRoot = join(packageRoot, "dist");
  mkdirSync(distRoot, { recursive: true });
  copyFileSync(
    join(packageRoot, "src", "assets", "models", "ATTRIBUTION.md"),
    join(distRoot, "ATTRIBUTION.md")
  );
};

const sharedOptions = {
  format: ["esm", "cjs"] as const,
  dts: true,
  sourcemap: true,
  onSuccess: copyModelAttribution,
  // Assets are copied into dist/ and the import statements are preserved in
  // the output, so the consumer's bundler resolves them to final URLs
  // (see docs/technical-debt/door-texture-asset-ownership.md).
  loader: {
    ".png": "copy",
    ".webp": "copy",
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
]);
