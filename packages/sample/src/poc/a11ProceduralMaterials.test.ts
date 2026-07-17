import assert from "node:assert/strict";
import test from "node:test";

import { createA11MaterialPixels } from "./a11ProceduralMaterials.ts";

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

test("generates byte-identical maps for the same dimensions and seed", () => {
  const first = createA11MaterialPixels(64, 48, 1101);
  const second = createA11MaterialPixels(64, 48, 1101);

  assert.deepEqual(first.colorPixels, second.colorPixels);
  assert.deepEqual(first.roughnessPixels, second.roughnessPixels);
});

test("changes both maps when the seed changes", () => {
  const first = createA11MaterialPixels(64, 48, 1101);
  const second = createA11MaterialPixels(64, 48, 1102);

  assert.notDeepEqual(first.colorPixels, second.colorPixels);
  assert.notDeepEqual(first.roughnessPixels, second.roughnessPixels);
});

test("returns complete RGBA buffers", () => {
  const { colorPixels, roughnessPixels } = createA11MaterialPixels(17, 9, 1101);

  assert.ok(colorPixels instanceof Uint8ClampedArray);
  assert.ok(roughnessPixels instanceof Uint8ClampedArray);
  assert.equal(colorPixels.length, 17 * 9 * 4);
  assert.equal(roughnessPixels.length, 17 * 9 * 4);
});

test("keeps the color map fully opaque", () => {
  const { colorPixels } = createA11MaterialPixels(32, 24, 1101);

  for (let index = 3; index < colorPixels.length; index += 4) {
    assert.equal(colorPixels[index], 255);
  }
});

test("keeps roughness grayscale and fully opaque", () => {
  const { roughnessPixels } = createA11MaterialPixels(32, 24, 1101);

  for (let index = 0; index < roughnessPixels.length; index += 4) {
    assert.equal(roughnessPixels[index], roughnessPixels[index + 1]);
    assert.equal(roughnessPixels[index], roughnessPixels[index + 2]);
    assert.equal(roughnessPixels[index + 3], 255);
  }
});

test("produces visible luminance variation", () => {
  const { colorPixels } = createA11MaterialPixels(64, 64, 1101);
  const values = luminances(colorPixels);
  const spread = Math.max(...values) - Math.min(...values);

  assert.ok(spread >= 24, `luminance spread ${spread} is too small`);
  assert.ok(new Set(values.map(Math.round)).size >= 12, "texture has too few luminance levels");
});

test("rejects invalid widths", () => {
  for (const width of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => createA11MaterialPixels(width, 8, 1101), RangeError);
  }
});

test("rejects invalid heights", () => {
  for (const height of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => createA11MaterialPixels(8, height, 1101), RangeError);
  }
});

test("rejects invalid seeds", () => {
  for (const seed of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5]) {
    assert.throws(() => createA11MaterialPixels(8, 8, seed), RangeError);
  }
});

test("rejects unsafe and oversized pixel counts", () => {
  assert.throws(
    () => createA11MaterialPixels(Number.MAX_SAFE_INTEGER, 2, 1101),
    RangeError,
  );
  assert.throws(() => createA11MaterialPixels(4097, 4097, 1101), RangeError);
});
