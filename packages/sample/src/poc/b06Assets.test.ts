import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  B06_FRONT_ASSETS,
  B06_FRONT_CROPS,
  B06_HANDLE,
  B06_LEAF_HEIGHT,
  B06_LEAF_WIDTH,
  B06_MEMBER_DEPTH,
  B06_WHEEL_COVER,
  extractB06FrontCrop,
  resolveB06FrontUrl,
} from "./b06Assets.ts";

const ASSET_PATHS = {
  normal: new URL("../../public/textures/b06/normal.png", import.meta.url),
  frozen: new URL("../../public/textures/b06/frozen.png", import.meta.url),
} as const;

const EXPECTED_ASSETS = {
  normal: {
    publicPath: "textures/b06/normal.png",
    width: 1586,
    height: 992,
    sha256: "a6a9c27a179d836a98f5b21ac9c43e20300e1c43bced2ec9f092fd8ac0157f04",
  },
  frozen: {
    publicPath: "textures/b06/frozen.png",
    width: 1586,
    height: 992,
    sha256: "669cbc0e47df1adfdb3955fcc898f9ce322ea1651f88337d9f31dceeeeeeab3d",
  },
} as const;

test("locks both approved generated PNG identities", () => {
  for (const variant of ["normal", "frozen"] as const) {
    const asset = readFileSync(ASSET_PATHS[variant]);
    const expected = EXPECTED_ASSETS[variant];

    assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(asset.toString("ascii", 12, 16), "IHDR");
    assert.equal(asset.readUInt32BE(16), expected.width);
    assert.equal(asset.readUInt32BE(20), expected.height);
    assert.equal(asset[24], 8);
    assert.equal(asset[25], 2);
    assert.equal(createHash("sha256").update(asset).digest("hex"), expected.sha256);
  }
});

test("exports immutable B06 asset, crop, and geometry contracts", () => {
  assert.deepEqual(B06_FRONT_ASSETS, EXPECTED_ASSETS);
  assert.deepEqual(B06_FRONT_CROPS, {
    left: { x: 377, y: 35, width: 410, height: 930 },
    right: { x: 797, y: 35, width: 410, height: 930 },
  });
  assert.equal(B06_LEAF_HEIGHT, 6);
  assert.equal(B06_LEAF_WIDTH, (6 * 410) / 930);
  assert.equal(B06_MEMBER_DEPTH, 0.18);
  assert.deepEqual(B06_WHEEL_COVER, {
    center: [(200 / 930) * 6, 3 - (505 / 930) * 6, 0.16],
    bakedRadiusPixels: 94,
    radius: 0.64,
    wheelRadius: 0.5,
  });
  assert.deepEqual(B06_HANDLE, {
    cropCenter: [220, 505],
    localCenter: [((220 - 410) / 930) * 6, 3 - (505 / 930) * 6, 0.18],
    barSize: [(28 / 930) * 6, (250 / 930) * 6, 0.16],
    mountSize: [(76 / 930) * 6, (54 / 930) * 6, 0.2],
    mountOffsetY: (125 / 930) * 6,
  });

  for (const value of [
    B06_FRONT_ASSETS,
    B06_FRONT_ASSETS.normal,
    B06_FRONT_ASSETS.frozen,
    B06_FRONT_CROPS,
    B06_FRONT_CROPS.left,
    B06_FRONT_CROPS.right,
    B06_WHEEL_COVER,
    B06_WHEEL_COVER.center,
    B06_HANDLE,
    B06_HANDLE.cropCenter,
    B06_HANDLE.localCenter,
    B06_HANDLE.barSize,
    B06_HANDLE.mountSize,
  ]) {
    assert.ok(Object.isFrozen(value));
  }
});

test("resolves normal and frozen URLs for development and production bases", () => {
  assert.equal(resolveB06FrontUrl("/", "normal"), "/textures/b06/normal.png");
  assert.equal(
    resolveB06FrontUrl("/re-canvas-door-swing/", "frozen"),
    "/re-canvas-door-swing/textures/b06/frozen.png",
  );
  assert.equal(
    resolveB06FrontUrl("/re-canvas-door-swing", "normal"),
    "/re-canvas-door-swing/textures/b06/normal.png",
  );
});

test("copies crop bytes in source order without reversing or mutating the source", () => {
  const source = new Uint8ClampedArray([
    1, 2, 3, 4, 11, 12, 13, 14, 21, 22, 23, 24, 31, 32, 33, 34,
    41, 42, 43, 44, 51, 52, 53, 54, 61, 62, 63, 64, 71, 72, 73, 74,
  ]);
  const original = source.slice();
  const crop = { x: 1, y: 0, width: 2, height: 2 } as const;

  const output = extractB06FrontCrop(source, 4, 2, crop);

  assert.deepEqual(
    output,
    new Uint8ClampedArray([
      11, 12, 13, 14, 21, 22, 23, 24,
      51, 52, 53, 54, 61, 62, 63, 64,
    ]),
  );
  assert.deepEqual(source, original);
});

test("rejects incomplete RGBA sources, invalid dimensions, and invalid crops", () => {
  assert.throws(
    () => extractB06FrontCrop(new Uint8ClampedArray([1, 2, 3]), 1, 1, {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }),
    RangeError,
  );

  const source = new Uint8ClampedArray(2 * 2 * 4);
  const validCrop = { x: 0, y: 0, width: 1, height: 1 } as const;
  for (const [width, height] of [
    [0, 2],
    [2, 0],
    [1.5, 2],
    [2, Number.NaN],
    [3, 2],
  ] as const) {
    assert.throws(() => extractB06FrontCrop(source, width, height, validCrop), RangeError);
  }

  for (const crop of [
    { x: -1, y: 0, width: 1, height: 1 },
    { x: 0, y: -1, width: 1, height: 1 },
    { x: 0, y: 0, width: 0, height: 1 },
    { x: 0, y: 0, width: 1, height: 0 },
    { x: 2, y: 0, width: 1, height: 1 },
    { x: 0, y: 2, width: 1, height: 1 },
    { x: 1, y: 0, width: 2, height: 1 },
    { x: 0, y: 1, width: 1, height: 2 },
  ] as const) {
    assert.throws(() => extractB06FrontCrop(source, 2, 2, crop), RangeError);
  }
});
