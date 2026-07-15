const BYTES_PER_PIXEL = 4;
const MAX_PIXEL_COUNT = 16_777_216;
const HASH_MAX = 0xffffffff;

const RUST_SEED_A = 0x6d2b79f5;
const RUST_SEED_B = 0x1b56c4e9;
const PATINA_SEED_A = 0x4a39b70d;
const PATINA_SEED_B = 0x12fad5c9;
const GRAIN_SEED = 0x45d9f3b;
const PIT_SEED = 0x27d4eb2d;
const SCRATCH_SEED = 0x165667b1;
const SCRATCH_PHASE_X_SEED = 0x51ed270b;
const SCRATCH_PHASE_Y_SEED = 0x68bc21eb;
const SCRATCH_ORIENTATION_SEED = 0x4cf5ad43;
const SCRATCH_LENGTH_SEED = 0x3c6ef372;
const CONTRAST_SEED_A = 0x7f4a7c15;
const CONTRAST_SEED_B = 0x2c1b3c6d;
const SCRATCH_CELL_SIZE = 16;

type AgedIronFeatures = {
  oxidation: number;
  patina: number;
  grain: number;
  pit: boolean;
  scratch: boolean;
};

export type AgedIronMaterialPixels = {
  colorPixels: Uint8ClampedArray;
  roughnessPixels: Uint8ClampedArray;
};

const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

const smoothstep = (value: number): number => value * value * (3 - 2 * value);

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const luminance = (red: number, green: number, blue: number): number =>
  red * 0.2126 + green * 0.7152 + blue * 0.0722;

const coordinateHash = (
  x: number,
  y: number,
  seedLow: number,
  seedHigh = 0,
): number => {
  let value =
    Math.imul(x ^ seedLow, 0x45d9f3b) ^
    Math.imul(y + seedLow, 0x27d4eb2d) ^
    Math.imul(seedHigh, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / HASH_MAX;
};

const coarseNoise = (
  x: number,
  y: number,
  scale: number,
  seedLow: number,
  seedHigh: number,
): number => {
  const cellX = Math.floor(x / scale);
  const cellY = Math.floor(y / scale);
  const offsetX = smoothstep((x % scale) / scale);
  const offsetY = smoothstep((y % scale) / scale);
  const top = lerp(
    coordinateHash(cellX, cellY, seedLow, seedHigh),
    coordinateHash(cellX + 1, cellY, seedLow, seedHigh),
    offsetX,
  );
  const bottom = lerp(
    coordinateHash(cellX, cellY + 1, seedLow, seedHigh),
    coordinateHash(cellX + 1, cellY + 1, seedLow, seedHigh),
    offsetX,
  );

  return lerp(top, bottom, offsetY);
};

const scaledHash = (value: number, range: number): number =>
  Math.min(range - 1, Math.floor(value * range));

const isScratchPixel = (
  x: number,
  y: number,
  seedLow: number,
  seedHigh: number,
): boolean => {
  const cellX = Math.floor(x / SCRATCH_CELL_SIZE);
  const cellY = Math.floor(y / SCRATCH_CELL_SIZE);

  if (coordinateHash(cellX, cellY, seedLow ^ SCRATCH_SEED, seedHigh) <= 0.72) {
    return false;
  }

  const centerX = scaledHash(
    coordinateHash(cellX, cellY, seedLow ^ SCRATCH_PHASE_X_SEED, seedHigh),
    SCRATCH_CELL_SIZE,
  );
  const centerY = scaledHash(
    coordinateHash(cellX, cellY, seedLow ^ SCRATCH_PHASE_Y_SEED, seedHigh),
    SCRATCH_CELL_SIZE,
  );
  const orientation = scaledHash(
    coordinateHash(cellX, cellY, seedLow ^ SCRATCH_ORIENTATION_SEED, seedHigh),
    4,
  );
  const halfLength =
    2 +
    scaledHash(coordinateHash(cellX, cellY, seedLow ^ SCRATCH_LENGTH_SEED, seedHigh), 4);
  const offsetX = (x % SCRATCH_CELL_SIZE) - centerX;
  const offsetY = (y % SCRATCH_CELL_SIZE) - centerY;

  if (orientation === 0) return offsetY === 0 && Math.abs(offsetX) <= halfLength;
  if (orientation === 1) return offsetX === 0 && Math.abs(offsetY) <= halfLength;
  if (orientation === 2) return offsetX === offsetY && Math.abs(offsetX) <= halfLength;
  return offsetX === -offsetY && Math.abs(offsetX) <= halfLength;
};

export const validateAgedIronInput = (
  width: number,
  height: number,
  seed: number,
): void => {
  if (!Number.isSafeInteger(width) || width <= 0) {
    throw new RangeError("width must be a positive safe integer");
  }
  if (!Number.isSafeInteger(height) || height <= 0) {
    throw new RangeError("height must be a positive safe integer");
  }
  if (width > Math.floor(MAX_PIXEL_COUNT / height)) {
    throw new RangeError(`dimensions must contain at most ${MAX_PIXEL_COUNT} pixels`);
  }
  if (width * height < 2) {
    throw new RangeError("dimensions must contain at least two pixels");
  }
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError("seed must be a safe integer");
  }
};

export const createAgedIronMaterialPixels = (
  width: number,
  height: number,
  seed: number,
): AgedIronMaterialPixels => {
  validateAgedIronInput(width, height, seed);

  const pixelCount = width * height;
  const colorPixels = new Uint8ClampedArray(pixelCount * BYTES_PER_PIXEL);
  const roughnessPixels = new Uint8ClampedArray(pixelCount * BYTES_PER_PIXEL);
  const seedLow = seed | 0;
  const seedHigh = Math.floor(seed / 0x1_0000_0000);
  let minimumLuminance = Number.POSITIVE_INFINITY;
  let maximumLuminance = Number.NEGATIVE_INFINITY;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const grain = coordinateHash(x, y, seedLow ^ GRAIN_SEED, seedHigh);
    const oxidationField =
      coarseNoise(x, y, 17, seedLow ^ RUST_SEED_A, seedHigh) * 0.7 +
      coarseNoise(x, y, 31, seedLow ^ RUST_SEED_B, seedHigh) * 0.3;
    const patinaField = coarseNoise(x, y, 23, seedLow ^ PATINA_SEED_A, seedHigh);
    const patinaSpeck = coordinateHash(x, y, seedLow ^ PATINA_SEED_B, seedHigh);
    const features: AgedIronFeatures = {
      oxidation: smoothstep(clampUnit((oxidationField - 0.34) / 0.48)),
      patina:
        smoothstep(clampUnit((patinaField - 0.64) / 0.28)) *
        smoothstep(clampUnit((patinaSpeck - 0.7) / 0.3)),
      grain,
      pit: coordinateHash(x, y, seedLow ^ PIT_SEED, seedHigh) > 0.988,
      scratch: isScratchPixel(x, y, seedLow, seedHigh),
    };
    const grainOffset = (features.grain - 0.5) * 16;
    const baseRed = 68 + grainOffset;
    const baseGreen = 38 + grainOffset * 0.45;
    const baseBlue = 40 + grainOffset * 0.5;
    let red = lerp(baseRed, 132 + grainOffset * 0.35, features.oxidation);
    let green = lerp(baseGreen, 88 + grainOffset * 0.25, features.oxidation);
    let blue = lerp(baseBlue, 43 + grainOffset * 0.2, features.oxidation);

    red = lerp(red, 88 + grainOffset * 0.2, features.patina);
    green = lerp(green, 106 + grainOffset * 0.25, features.patina);
    blue = lerp(blue, 82 + grainOffset * 0.2, features.patina);

    let roughness =
      194 +
      features.oxidation * 38 +
      features.patina * 42 +
      (features.grain - 0.5) * 16;

    if (features.scratch) {
      red = 174 + features.grain * 24;
      green = 150 + features.grain * 20;
      blue = 105 + features.grain * 20;
      roughness = 154 + features.grain * 25;
    }

    if (features.pit) {
      red = 26 + features.grain * 9;
      green = 24 + features.grain * 7;
      blue = 21 + features.grain * 6;
      roughness = 238 + features.grain * 14;
    }

    const index = pixel * BYTES_PER_PIXEL;
    colorPixels[index] = red;
    colorPixels[index + 1] = green;
    colorPixels[index + 2] = blue;
    colorPixels[index + 3] = 255;
    roughnessPixels[index] = roughness;
    roughnessPixels[index + 1] = roughness;
    roughnessPixels[index + 2] = roughness;
    roughnessPixels[index + 3] = 255;

    const pixelLuminance = luminance(
      colorPixels[index],
      colorPixels[index + 1],
      colorPixels[index + 2],
    );
    minimumLuminance = Math.min(minimumLuminance, pixelLuminance);
    maximumLuminance = Math.max(maximumLuminance, pixelLuminance);
  }

  if (maximumLuminance - minimumLuminance < 70) {
    const pitHash = coordinateHash(width, height, seedLow ^ CONTRAST_SEED_A, seedHigh);
    const scratchHash = coordinateHash(height, width, seedLow ^ CONTRAST_SEED_B, seedHigh);
    const pitPixel = Math.min(pixelCount - 1, Math.floor(pitHash * pixelCount));
    let scratchPixel = Math.min(pixelCount - 1, Math.floor(scratchHash * pixelCount));

    if (scratchPixel === pitPixel) {
      scratchPixel = (scratchPixel + 1) % pixelCount;
    }

    const pitIndex = pitPixel * BYTES_PER_PIXEL;
    colorPixels[pitIndex] = 26;
    colorPixels[pitIndex + 1] = 24;
    colorPixels[pitIndex + 2] = 21;
    colorPixels[pitIndex + 3] = 255;
    roughnessPixels[pitIndex] = 246;
    roughnessPixels[pitIndex + 1] = 246;
    roughnessPixels[pitIndex + 2] = 246;
    roughnessPixels[pitIndex + 3] = 255;

    const scratchIndex = scratchPixel * BYTES_PER_PIXEL;
    colorPixels[scratchIndex] = 186;
    colorPixels[scratchIndex + 1] = 160;
    colorPixels[scratchIndex + 2] = 116;
    colorPixels[scratchIndex + 3] = 255;
    roughnessPixels[scratchIndex] = 166;
    roughnessPixels[scratchIndex + 1] = 166;
    roughnessPixels[scratchIndex + 2] = 166;
    roughnessPixels[scratchIndex + 3] = 255;
  }

  return { colorPixels, roughnessPixels };
};

export const createAgedIronPixels = (
  width: number,
  height: number,
  seed: number,
): Uint8ClampedArray => createAgedIronMaterialPixels(width, height, seed).colorPixels;
