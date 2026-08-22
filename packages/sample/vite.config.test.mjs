import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const configUrl = new URL("./vite.config.ts", import.meta.url);

test("uses the library source while developing the sample", async () => {
  const source = await readFile(fileURLToPath(configUrl), "utf8");

  assert.match(
    source,
    /"retro-horror-door": path\.resolve\(__dirname, "\.\.\/door-lib\/src\/index\.ts"\)/
  );
});
