import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const configUrl = new URL("./vite.config.ts", import.meta.url);

test("uses the library source by default while allowing an installed package override", async () => {
  const source = await readFile(fileURLToPath(configUrl), "utf8");

  assert.match(
    source,
    /"retro-horror-door": process\.env\.DOOR_PACKAGE_ENTRY \|\| path\.resolve\(__dirname, "\.\.\/door-lib\/src\/index\.ts"\)/
  );
  assert.match(source, /DOOR_BETA_BUILD_MODULE_IDS_FILE/);
  assert.match(source, /this\.getModuleIds\(\)/);
});
