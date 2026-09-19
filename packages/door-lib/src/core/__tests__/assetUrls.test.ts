import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_ASSET_BASE_URL, resolveAssetUrl } from "../assetUrls.ts";

it("uses pinned CDN URLs by default and rebases owned assets only", () => {
  const url = `${DEFAULT_ASSET_BASE_URL}/textures/door.webp`;
  assert.equal(resolveAssetUrl(url), url);
  assert.equal(resolveAssetUrl(url, "/app/door-assets/"), "/app/door-assets/textures/door.webp");
  assert.equal(resolveAssetUrl(url, "https://example.com/media"), "https://example.com/media/textures/door.webp");
  assert.equal(resolveAssetUrl("https://other.com/custom.webp", "/local"), "https://other.com/custom.webp");
  assert.equal(resolveAssetUrl(undefined, "/local"), undefined);
});
