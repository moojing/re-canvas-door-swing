import assert from "node:assert/strict";
import test from "node:test";

import { A04_TEXTURE_PATHS, resolveA04TextureUrl } from "./a04TextureUrls.ts";

const texturePath = "textures/a04/metal-plate-02-diffuse.jpg" as const;

test("tracks the complete four-map A04 PBR asset set", () => {
  assert.deepEqual(A04_TEXTURE_PATHS, [
    "textures/a04/metal-plate-02-diffuse.jpg",
    "textures/a04/metal-plate-02-roughness.jpg",
    "textures/a04/green-metal-rust-diffuse.jpg",
    "textures/a04/green-metal-rust-roughness.jpg",
  ]);
});

test("normalizes an empty base URL", () => {
  assert.equal(resolveA04TextureUrl("", texturePath), `/${texturePath}`);
});

test("normalizes a base URL with trailing slashes", () => {
  assert.equal(resolveA04TextureUrl("/re-canvas-door-swing///", texturePath),
    `/re-canvas-door-swing/${texturePath}`,
  );
});

test("preserves nested base paths", () => {
  assert.equal(resolveA04TextureUrl("/apps/doors/", texturePath),
    `/apps/doors/${texturePath}`,
  );
});
