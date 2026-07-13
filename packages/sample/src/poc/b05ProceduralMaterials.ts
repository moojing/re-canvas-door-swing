const BYTES_PER_PIXEL = 4;
const MAX_PIXEL_COUNT = 16_777_216;
const HASH_MAX = 0xffffffff;

const RUST_SEED_A = 0x6d2b79f5;
const RUST_SEED_B = 0x1b56c4e9;
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

const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

const smoothstep = (value: number): number => value * value * (3 - 2 * value);

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

const validateInput = (width: number, height: number, seed: number): void => {
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

export const createAgedIronPixels = (
  width: number,
  height: number,
  seed: number,
): Uint8ClampedArray => {
  validateInput(width, height, seed);

  const pixels = new Uint8ClampedArray(width * height * BYTES_PER_PIXEL);
  const pixelCount = width * height;
  const seedLow = seed | 0;
  const seedHigh = Math.floor(seed / 0x1_0000_0000);
  let minimumLuminance = Number.POSITIVE_INFINITY;
  let maximumLuminance = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fine = coordinateHash(x, y, seedLow ^ GRAIN_SEED, seedHigh);
      const rustField =
        coarseNoise(x, y, 17, seedLow ^ RUST_SEED_A, seedHigh) * 0.7 +
        coarseNoise(x, y, 31, seedLow ^ RUST_SEED_B, seedHigh) * 0.3;
      const rustAmount = smoothstep(Math.max(0, Math.min(1, (rustField - 0.38) / 0.42)));
      const grain = (fine - 0.5) * 18;

      let red = 72 + grain + rustAmount * 58;
      let green = 70 + grain * 0.8 - rustAmount * 18;
      let blue = 64 + grain * 0.65 - rustAmount * 32;

      const isPit = coordinateHash(x, y, seedLow ^ PIT_SEED, seedHigh) > 0.988;
      const isScratch = isScratchPixel(x, y, seedLow, seedHigh);

      if (isPit) {
        red = 26 + fine * 8;
        green = 24 + fine * 6;
        blue = 21 + fine * 5;
      }

      if (isScratch) {
        red = 190 + fine * 32;
        green = 176 + fine * 25;
        blue = 140 + fine * 18;
      }

      const index = (y * width + x) * BYTES_PER_PIXEL;
      pixels[index] = red;
      pixels[index + 1] = green;
      pixels[index + 2] = blue;
      pixels[index + 3] = 255;

      const pixelLuminance = luminance(pixels[index], pixels[index + 1], pixels[index + 2]);
      minimumLuminance = Math.min(minimumLuminance, pixelLuminance);
      maximumLuminance = Math.max(maximumLuminance, pixelLuminance);
    }
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
    pixels[pitIndex] = 26;
    pixels[pitIndex + 1] = 24;
    pixels[pitIndex + 2] = 21;
    pixels[pitIndex + 3] = 255;

    const scratchIndex = scratchPixel * BYTES_PER_PIXEL;
    pixels[scratchIndex] = 190;
    pixels[scratchIndex + 1] = 176;
    pixels[scratchIndex + 2] = 140;
    pixels[scratchIndex + 3] = 255;
  }

  return pixels;
};
