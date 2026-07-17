import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  B05_FRONT_IMAGE,
  B05_FRONT_PLANE,
  extractB05FrontCrop,
  removeB05NearBlackBackground,
  resolveB05FrontUrl,
} from "./b05FrontImage.ts";

const B05_FRONT_ASSET_DISK_PATH = new URL(
  "../../public/textures/b05/generated-gate-front.png",
  import.meta.url,
);

test("locks the committed generated-front PNG identity", () => {
  const asset = readFileSync(B05_FRONT_ASSET_DISK_PATH);

  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(asset.toString("ascii", 12, 16), "IHDR");
  assert.equal(asset.readUInt32BE(16), 758);
  assert.equal(asset.readUInt32BE(20), 636);
  assert.equal(asset[24], 8);
  assert.equal(asset[25], 6);
  assert.equal(
    createHash("sha256").update(asset).digest("hex"),
    "f00e7e6f0844077dc2a930027db3d8dd40b34341d56320b197cd1855ad4cb77b",
  );
});

test("exports immutable generated-front image and plane contracts", () => {
  assert.deepEqual(B05_FRONT_IMAGE, {
    publicPath: "textures/b05/generated-gate-front.png",
    width: 758,
    height: 636,
    sha256: "f00e7e6f0844077dc2a930027db3d8dd40b34341d56320b197cd1855ad4cb77b",
    alphaThreshold: 8,
    leftCrop: { x: 44, y: 20, width: 324, height: 616, flipX: false },
    rightCrop: { x: 368, y: 20, width: 324, height: 616, flipX: true },
  });
  assert.deepEqual(B05_FRONT_PLANE, {
    size: [2.7, 5.35],
    position: [1.35, 2.675, 0.22],
  });
  assert.ok(Object.isFrozen(B05_FRONT_IMAGE));
  assert.ok(Object.isFrozen(B05_FRONT_IMAGE.leftCrop));
  assert.ok(Object.isFrozen(B05_FRONT_IMAGE.rightCrop));
  assert.ok(Object.isFrozen(B05_FRONT_PLANE));
  assert.ok(Object.isFrozen(B05_FRONT_PLANE.size));
  assert.ok(Object.isFrozen(B05_FRONT_PLANE.position));
});

test("resolves the generated-front URL for development and production bases", () => {
  assert.equal(resolveB05FrontUrl("/"), "/textures/b05/generated-gate-front.png");
  assert.equal(
    resolveB05FrontUrl("/re-canvas-door-swing/"),
    "/re-canvas-door-swing/textures/b05/generated-gate-front.png",
  );
  assert.equal(
    resolveB05FrontUrl("/re-canvas-door-swing"),
    "/re-canvas-door-swing/textures/b05/generated-gate-front.png",
  );
});

test("makes pixels at the near-black threshold transparent in a clone", () => {
  const source = new Uint8ClampedArray([8, 3, 7, 211, 0, 0, 0, 99]);
  const original = source.slice();

  const output = removeB05NearBlackBackground(source);

  assert.notEqual(output, source);
  assert.deepEqual(output, new Uint8ClampedArray([8, 3, 7, 0, 0, 0, 0, 0]));
  assert.deepEqual(source, original);
});

test("preserves all four bytes when any RGB channel is above the threshold", () => {
  const source = new Uint8ClampedArray([9, 2, 1, 173]);

  assert.deepEqual(removeB05NearBlackBackground(source), source);
});

test("rejects a source that is not complete RGBA pixels", () => {
  assert.throws(
    () => removeB05NearBlackBackground(new Uint8ClampedArray([1, 2, 3])),
    RangeError,
  );
  assert.throws(
    () =>
      extractB05FrontCrop(
        new Uint8ClampedArray([1, 2, 3]),
        1,
        1,
        { x: 0, y: 0, width: 1, height: 1, flipX: false },
      ),
    RangeError,
  );
});

test("rejects invalid source dimensions and crop bounds", () => {
  const source = new Uint8ClampedArray(2 * 2 * 4);
  const validCrop = { x: 0, y: 0, width: 1, height: 1, flipX: false } as const;

  for (const dimensions of [
    [0, 2],
    [2, 0],
    [1.5, 2],
    [2, Number.NaN],
    [3, 2],
  ] as const) {
    assert.throws(
      () => extractB05FrontCrop(source, dimensions[0], dimensions[1], validCrop),
      RangeError,
    );
  }

  for (const crop of [
    { x: -1, y: 0, width: 1, height: 1, flipX: false },
    { x: 0, y: -1, width: 1, height: 1, flipX: false },
    { x: 0, y: 0, width: 0, height: 1, flipX: false },
    { x: 0, y: 0, width: 1, height: 0, flipX: false },
    { x: 2, y: 0, width: 1, height: 1, flipX: false },
    { x: 0, y: 2, width: 1, height: 1, flipX: false },
    { x: 1, y: 0, width: 2, height: 1, flipX: false },
    { x: 0, y: 1, width: 1, height: 2, flipX: false },
  ] as const) {
    assert.throws(() => extractB05FrontCrop(source, 2, 2, crop), RangeError);
  }
});

test("copies left crop bytes in source order without mutating the source", () => {
  const source = new Uint8ClampedArray([
    1, 2, 3, 4, 11, 12, 13, 14, 21, 22, 23, 24, 31, 32, 33, 34,
    41, 42, 43, 44, 51, 52, 53, 54, 61, 62, 63, 64, 71, 72, 73, 74,
  ]);
  const original = source.slice();

  const output = extractB05FrontCrop(source, 4, 2, {
    x: 1,
    y: 0,
    width: 2,
    height: 2,
    flipX: false,
  });

  assert.deepEqual(
    output,
    new Uint8ClampedArray([
      11, 12, 13, 14, 21, 22, 23, 24,
      51, 52, 53, 54, 61, 62, 63, 64,
    ]),
  );
  assert.deepEqual(source, original);
});

test("reverses each right-crop row horizontally exactly once", () => {
  const source = new Uint8ClampedArray([
    1, 2, 3, 4, 11, 12, 13, 14, 21, 22, 23, 24, 31, 32, 33, 34,
    41, 42, 43, 44, 51, 52, 53, 54, 61, 62, 63, 64, 71, 72, 73, 74,
  ]);

  const output = extractB05FrontCrop(source, 4, 2, {
    x: 1,
    y: 0,
    width: 2,
    height: 2,
    flipX: true,
  });

  assert.deepEqual(
    output,
    new Uint8ClampedArray([
      21, 22, 23, 24, 11, 12, 13, 14,
      61, 62, 63, 64, 51, 52, 53, 54,
    ]),
  );
});
