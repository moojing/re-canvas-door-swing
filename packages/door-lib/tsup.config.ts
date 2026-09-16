import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

const copyModelAttribution = async () => {
  const distRoot = join(packageRoot, "dist");
  mkdirSync(distRoot, { recursive: true });
  copyFileSync(
    join(packageRoot, "..", "door-assets", "models", "ATTRIBUTION.md"),
    join(distRoot, "ATTRIBUTION.md")
  );
};

const sharedOptions = {
  format: ["esm", "cjs"] as const,
  dts: { resolve: [/^retro-horror-door-assets(?:\/|$)/] },
  noExternal: [/^retro-horror-door-assets(?:\/|$)/],
  sourcemap: true,
  onSuccess: copyModelAttribution,

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
