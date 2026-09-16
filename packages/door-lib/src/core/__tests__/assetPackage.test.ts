import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "node:test";
import { DEFAULT_ASSET_BASE_URL } from "../assetUrls.ts";
import { doorEntrancePresets } from "../presets.ts";

it("pins the independent asset release and every preset URL names an authored file", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../../../door-assets/package.json", import.meta.url), "utf8"));
  assert.equal(DEFAULT_ASSET_BASE_URL, `https://cdn.jsdelivr.net/npm/${manifest.name}@${manifest.version}`);
  for (const preset of doorEntrancePresets) {
    for (const url of [preset.frontTextureUrl, preset.backTextureUrl, preset.edgeTextureUrl, preset.handleModelUrl]) {
      if (!url) continue;
      assert.ok(url.startsWith(`${DEFAULT_ASSET_BASE_URL}/`));
      assert.ok(existsSync(fileURLToPath(new URL(`../../../../door-assets/${url.slice(DEFAULT_ASSET_BASE_URL.length + 1)}`, import.meta.url))));
    }
  }
});
