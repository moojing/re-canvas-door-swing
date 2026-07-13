import assert from "node:assert/strict";
import test from "node:test";

import {
  createGridPixels,
  createPlatePixels,
  createRustPixels,
} from "./c03ProceduralMaterials.ts";

const checksum = (pixels: Uint8ClampedArray) =>
  pixels.reduce((total, value, index) => (total + value * (index + 1)) % 1_000_000_007, 0);

const averageVisibleLuminance = (pixels: Uint8ClampedArray) => {
  let total = 0;
  let count = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    total += pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    count += 1;
  }

  return total / count;
};

const visibleLuminances = (pixels: Uint8ClampedArray) => {
  const values: number[] = [];

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    values.push(
      pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722
    );
  }

  return values;
};

test("procedural C03 materials are deterministic", () => {
  assert.equal(checksum(createRustPixels(32, 32)), checksum(createRustPixels(32, 32)));
  assert.equal(checksum(createPlatePixels(32, 32, 17)), checksum(createPlatePixels(32, 32, 17)));
});

test("procedural grid contains opaque mesh and transparent openings", () => {
  const pixels = createGridPixels(64, 64);
  const alpha = pixels.filter((_, index) => index % 4 === 3);

  assert.ok(alpha.some((value) => value === 0));
  assert.ok(alpha.some((value) => value === 255));
});

test("procedural material output is complete RGBA data", () => {
  assert.equal(createRustPixels(16, 8).length, 16 * 8 * 4);
  assert.equal(createGridPixels(16, 8).length, 16 * 8 * 4);
  assert.equal(createPlatePixels(16, 8, 5).length, 16 * 8 * 4);
});

test("procedural materials remain legible against a black background", () => {
  assert.ok(averageVisibleLuminance(createRustPixels(64, 64)) >= 65);
  assert.ok(averageVisibleLuminance(createGridPixels(64, 64)) >= 120);
  assert.ok(averageVisibleLuminance(createPlatePixels(64, 64, 17)) >= 75);
});

test("procedural materials include aged contrast and wear", () => {
  const rustLuminance = visibleLuminances(createRustPixels(64, 64));
  const plateLuminance = visibleLuminances(createPlatePixels(64, 64, 17));

  assert.ok(Math.min(...rustLuminance) < 35);
  assert.ok(Math.max(...rustLuminance) > 120);
  assert.ok(Math.max(...plateLuminance) > 150);
});
