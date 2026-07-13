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

  assert.equal(checksum(first), 575_386_821);
  assert.equal(checksum(first), checksum(second));
  assert.deepEqual(first, second);
  assert.notEqual(checksum(first), checksum(alternate));
});

test("preserves high bits of safe-integer seeds", () => {
  const lowSeed = createAgedIronPixels(64, 64, 51);
  const highSeed = createAgedIronPixels(64, 64, 2 ** 32 + 51);

  assert.notEqual(checksum(lowSeed), checksum(highSeed));
  assert.notDeepEqual(lowSeed, highSeed);
  assert.deepEqual(highSeed, createAgedIronPixels(64, 64, 2 ** 32 + 51));
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

test("guarantees visible contrast across supported seeds and dimensions", () => {
  const dimensions: ReadonlyArray<readonly [number, number]> = [
    [1, 2],
    [8, 8],
    [16, 8],
    [64, 64],
  ];
  const seeds = [
    ...Array.from({ length: 1_000 }, (_, seed) => seed),
    -1,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    2 ** 32 + 51,
  ];

  for (const [width, height] of dimensions) {
    for (const seed of seeds) {
      const values = luminances(createAgedIronPixels(width, height, seed));
      const minimum = Math.min(...values);
      const spread = Math.max(...values) - minimum;

      assert.ok(minimum >= 20, `${width}x${height} seed ${seed} is too dark`);
      assert.ok(spread >= 70, `${width}x${height} seed ${seed} spread is ${spread}`);
    }
  }
});

test("varies scratch phase and orientation without a fixed horizontal lattice", () => {
  const width = 128;
  const height = 128;
  const pixels = createAgedIronPixels(width, height, 51);
  const brightPixels = new Set<string>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const value =
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;

      if (value > 140) brightPixels.add(`${x},${y}`);
    }
  }

  const coordinates = [...brightPixels].map((coordinate) =>
    coordinate.split(",").map(Number) as [number, number],
  );
  const hasHorizontalRun = coordinates.some(([x, y]) => brightPixels.has(`${x + 1},${y}`));
  const hasVerticalRun = coordinates.some(([x, y]) => brightPixels.has(`${x},${y + 1}`));
  const hasDiagonalRun = coordinates.some(
    ([x, y]) =>
      brightPixels.has(`${x + 1},${y + 1}`) || brightPixels.has(`${x + 1},${y - 1}`),
  );

  assert.ok(hasHorizontalRun);
  assert.ok(hasVerticalRun);
  assert.ok(hasDiagonalRun);
  assert.ok(coordinates.some(([x]) => x % 13 < 2 || x % 13 > 10));
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
    [1, 1],
    [1_000_000, 1_000_000],
  ];

  for (const [width, height] of invalidDimensions) {
    assert.throws(() => createAgedIronPixels(width, height, 51), RangeError);
  }
});
