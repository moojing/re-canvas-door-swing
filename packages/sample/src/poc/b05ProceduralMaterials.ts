const BYTES_PER_PIXEL = 4;
const MAX_PIXEL_COUNT = 16_777_216;
const HASH_MAX = 0xffffffff;

const RUST_SEED_A = 0x6d2b79f5;
const RUST_SEED_B = 0x1b56c4e9;
const GRAIN_SEED = 0x45d9f3b;
const PIT_SEED = 0x27d4eb2d;
const SCRATCH_SEED = 0x165667b1;

const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

const smoothstep = (value: number): number => value * value * (3 - 2 * value);

const coordinateHash = (x: number, y: number, seed: number): number => {
  let value = Math.imul(x ^ seed, 0x45d9f3b) ^ Math.imul(y + seed, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / HASH_MAX;
};

const coarseNoise = (
  x: number,
  y: number,
  scale: number,
  seed: number,
): number => {
  const cellX = Math.floor(x / scale);
  const cellY = Math.floor(y / scale);
  const offsetX = smoothstep((x % scale) / scale);
  const offsetY = smoothstep((y % scale) / scale);
  const top = lerp(
    coordinateHash(cellX, cellY, seed),
    coordinateHash(cellX + 1, cellY, seed),
    offsetX,
  );
  const bottom = lerp(
    coordinateHash(cellX, cellY + 1, seed),
    coordinateHash(cellX + 1, cellY + 1, seed),
    offsetX,
  );

  return lerp(top, bottom, offsetY);
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
  const normalizedSeed = seed | 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fine = coordinateHash(x, y, normalizedSeed ^ GRAIN_SEED);
      const rustField =
        coarseNoise(x, y, 17, normalizedSeed ^ RUST_SEED_A) * 0.7 +
        coarseNoise(x, y, 31, normalizedSeed ^ RUST_SEED_B) * 0.3;
      const rustAmount = smoothstep(Math.max(0, Math.min(1, (rustField - 0.38) / 0.42)));
      const grain = (fine - 0.5) * 18;

      let red = 72 + grain + rustAmount * 58;
      let green = 70 + grain * 0.8 - rustAmount * 18;
      let blue = 64 + grain * 0.65 - rustAmount * 32;

      const isPit = coordinateHash(x, y, normalizedSeed ^ PIT_SEED) > 0.988;
      const scratchCellX = Math.floor(x / 13);
      const scratchOffsetX = x % 13;
      const isScratch =
        scratchOffsetX >= 2 &&
        scratchOffsetX <= 10 &&
        coordinateHash(scratchCellX, y, normalizedSeed ^ SCRATCH_SEED) > 0.985;

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
    }
  }

  return pixels;
};
