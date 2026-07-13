import assert from "node:assert/strict";
import test from "node:test";

import { createAgedIronPixels } from "./b05ProceduralMaterials.ts";

const checksum = (pixels: Uint8ClampedArray): number =>
  pixels.reduce(
    (total, value, index) => (total + value * (index + 1)) % 1_000_000_007,
    0,
  );

const luminances = (pixels: Uint8ClampedArray): number[] => {
  const values: number[] = [];

  for (let index = 0; index < pixels.length; index += 4) {
    values.push(
      pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722,
    );
  }

  return values;
};

test("aged iron is deterministic for a seed and changes across seeds", () => {
  const first = createAgedIronPixels(64, 64, 51);
  const second = createAgedIronPixels(64, 64, 51);
  const alternate = createAgedIronPixels(64, 64, 52);

  assert.equal(checksum(first), 681_818_626);
  assert.equal(checksum(first), checksum(second));
  assert.deepEqual(first, second);
  assert.notEqual(checksum(first), checksum(alternate));
});

test("returns an exact, fully opaque RGBA byte buffer", () => {
  const pixels = createAgedIronPixels(16, 8, 51);

  assert.ok(pixels instanceof Uint8ClampedArray);
  assert.equal(pixels.length, 16 * 8 * 4);

  for (let index = 3; index < pixels.length; index += 4) {
    assert.equal(pixels[index], 255);
  }
});

test("keeps dark details visible while providing aged contrast", () => {
  const values = luminances(createAgedIronPixels(64, 64, 51));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  assert.ok(minimum >= 20, `minimum luminance ${minimum} is below 20`);
  assert.ok(maximum - minimum >= 70, `luminance spread ${maximum - minimum} is below 70`);
});

test("rejects dimensions that cannot produce a well-formed buffer", () => {
  const invalidDimensions: ReadonlyArray<readonly [number, number]> = [
    [0, 8],
    [8, 0],
    [-1, 8],
    [8, -1],
    [1.5, 8],
    [8, 1.5],
    [Number.NaN, 8],
    [8, Number.POSITIVE_INFINITY],
    [1_000_000, 1_000_000],
  ];

  for (const [width, height] of invalidDimensions) {
    assert.throws(() => createAgedIronPixels(width, height, 51), RangeError);
  }
});
