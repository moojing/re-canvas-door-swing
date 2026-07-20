import assert from "node:assert/strict";
import test from "node:test";

import {
  setTextureColorSpace,
  type TextureColorSpaceRuntime,
} from "./textureColorSpace.ts";

type TestTexture = {
  colorSpace?: string;
  encoding?: number;
};

test("uses SRGBColorSpace when the runtime exposes it", () => {
  const texture = {} as TestTexture;
  const runtime: TextureColorSpaceRuntime = { SRGBColorSpace: "srgb" };

  setTextureColorSpace(texture as never, runtime);

  assert.equal(texture.colorSpace, "srgb");
  assert.equal(texture.encoding, undefined);
});

test("falls back to sRGBEncoding for legacy runtimes", () => {
  const texture = {} as TestTexture;
  const runtime: TextureColorSpaceRuntime = { sRGBEncoding: 3001 };

  setTextureColorSpace(texture as never, runtime);

  assert.equal(texture.encoding, 3001);
  assert.equal(texture.colorSpace, undefined);
});
