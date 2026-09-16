import assert from "node:assert/strict";
import { readFileSync, accessSync } from "node:fs";
import * as cdn from "./cdn.js";
import { DEFAULT_ASSET_BASE_URL } from "./base.js";

// Validate both entry points before publication, without importing binary media.
const manifest = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
assert.equal(DEFAULT_ASSET_BASE_URL, `https://cdn.jsdelivr.net/npm/${manifest.name}@${manifest.version}`);
const entry = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const names = [];
for (const [, name, path] of entry.matchAll(/export \{ default as (\w+) \} from "\.\/([^"]+)"/g)) {
  accessSync(new URL(path, import.meta.url));
  names.push(name);
  assert.equal(cdn[name], `${DEFAULT_ASSET_BASE_URL}/${path}`);
}
assert.deepEqual(names.sort(), Object.keys(cdn).sort());
