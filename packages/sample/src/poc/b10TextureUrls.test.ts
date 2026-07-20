import assert from "node:assert/strict";
import test from "node:test";

import {
  B10_TEXTURE_PATHS,
  resolveB10TextureUrl,
  type B10TexturePath,
} from "./b10TextureUrls.ts";

const EXPECTED_PATHS = [
  "textures/b10/door.png",
  "textures/b10/lower.png",
  "textures/b10/lever-sign.png",
  "textures/b10/lever-box.png",
] as const satisfies readonly B10TexturePath[];

test("exports exactly four unique immutable relative B10 texture paths", () => {
  assert.deepEqual(B10_TEXTURE_PATHS, EXPECTED_PATHS);
  assert.equal(B10_TEXTURE_PATHS.length, 4);
  assert.equal(new Set(B10_TEXTURE_PATHS).size, 4);
  assert.ok(Object.isFrozen(B10_TEXTURE_PATHS));
  assert.ok(B10_TEXTURE_PATHS.every((texturePath) => !texturePath.startsWith("/")));
});

test("resolves every B10 texture path under development and production bases", () => {
  for (const texturePath of EXPECTED_PATHS) {
    assert.equal(resolveB10TextureUrl("/", texturePath), `/${texturePath}`);
    assert.equal(
      resolveB10TextureUrl("/re-canvas-door-swing/", texturePath),
      `/re-canvas-door-swing/${texturePath}`,
    );
  }
});

test("normalizes boundary slashes without producing protocol-relative URLs", () => {
  for (const texturePath of EXPECTED_PATHS) {
    for (const baseUrl of ["/", "///", "/re-canvas-door-swing", "//re-canvas-door-swing///"]) {
      const resolvedUrl = resolveB10TextureUrl(baseUrl, texturePath);
      assert.equal(resolvedUrl.startsWith("//"), false, resolvedUrl);
      assert.equal(resolvedUrl.includes("//"), false, resolvedUrl);
    }
  }

  assert.equal(
    resolveB10TextureUrl("//re-canvas-door-swing///", EXPECTED_PATHS[0]),
    "/re-canvas-door-swing/textures/b10/door.png",
  );
});
