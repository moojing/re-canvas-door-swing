import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, spawn } from "node:child_process";

// Isolate the registry install so npm cannot silently use our workspace package.
const version = process.argv[2] || "beta";
if (!/^[a-zA-Z0-9.+-]+$/.test(version)) throw new Error("Expected an npm version or dist-tag");
const directory = mkdtempSync(join(tmpdir(), "door-beta-"));
writeFileSync(join(directory, "package.json"), '{"private":true}');
const install = spawnSync("npm", ["install", "--prefix", directory, "--no-audit", "--no-fund", `retro-horror-door@${version}`], { stdio: "inherit" });
if (install.status !== 0) process.exit(install.status || 1);
const child = spawn("npm", ["run", "dev", "--", "--force"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DOOR_PACKAGE_ENTRY: join(directory, "node_modules/retro-horror-door/dist/index.js"),
    VITE_DOOR_ASSET_MODE: "cdn",
  },
});
child.on("exit", code => process.exit(code || 0));
