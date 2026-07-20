import assert from "node:assert/strict";
import test from "node:test";

import { resolveA04TextureUrl } from "./a04TextureUrls.ts";

const texturePath = "textures/a04/sewer-gate-aged-albedo.png" as const;

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
