const BYTES_PER_PIXEL = 4;
const MAX_PIXEL_COUNT = 16_777_216;
const UINT32_RANGE = 0x1_0000_0000;
const TAU = Math.PI * 2;
const WEAR_CELL_SIZE = 24;

export type A11MaterialPixels = Readonly<{
  colorPixels: Uint8ClampedArray;
  roughnessPixels: Uint8ClampedArray;
}>;

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const smoothstep = (value: number): number => value * value * (3 - 2 * value);

const createSeededRandom = (seed: number): (() => number) => {
  const low = seed | 0;
  const high = Math.floor(seed / UINT32_RANGE) | 0;
  let state = (low ^ Math.imul(high, 0x9e3779b1)) >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
};

const coordinateRandom = (x: number, y: number, salt: number): number => {
  let value =
    Math.imul(x ^ salt, 0x45d9f3b) ^
    Math.imul(y + salt, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / UINT32_RANGE;
};

const isWearPixel = (
  x: number,
  y: number,
  wearSalt: number,
  phaseSalt: number,
): boolean => {
  const cellX = Math.floor(x / WEAR_CELL_SIZE);
  const cellY = Math.floor(y / WEAR_CELL_SIZE);

  if (coordinateRandom(cellX, cellY, wearSalt) < 0.82) return false;

  const centerX = Math.floor(
    coordinateRandom(cellX, cellY, phaseSalt) * WEAR_CELL_SIZE,
  );
  const centerY = Math.floor(
    coordinateRandom(cellY, cellX, phaseSalt ^ 0x68bc21eb) * WEAR_CELL_SIZE,
  );
  const horizontal = coordinateRandom(cellX, cellY, wearSalt ^ 0x4cf5ad43) < 0.5;
  const halfLength =
    2 + Math.floor(coordinateRandom(cellY, cellX, wearSalt ^ 0x3c6ef372) * 5);
  const offsetX = (x % WEAR_CELL_SIZE) - centerX;
  const offsetY = (y % WEAR_CELL_SIZE) - centerY;

  return horizontal
    ? offsetY === 0 && Math.abs(offsetX) <= halfLength
    : offsetX === 0 && Math.abs(offsetY) <= halfLength;
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
  if (!Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new RangeError("seed must be a finite integer");
  }
};

export const createA11MaterialPixels = (
  width: number,
  height: number,
  seed: number,
): A11MaterialPixels => {
  validateInput(width, height, seed);

  const pixelCount = width * height;
  const colorPixels = new Uint8ClampedArray(pixelCount * BYTES_PER_PIXEL);
  const roughnessPixels = new Uint8ClampedArray(pixelCount * BYTES_PER_PIXEL);
  const random = createSeededRandom(seed);
  const phaseA = random() * TAU;
  const phaseB = random() * TAU;
  const phaseC = random() * TAU;
  const frequencyA = 0.7 + random() * 0.8;
  const frequencyB = 1.1 + random() * 0.9;
  const grainSalt = Math.floor(random() * UINT32_RANGE);
  const pitSalt = Math.floor(random() * UINT32_RANGE);
  const wearSalt = Math.floor(random() * UINT32_RANGE);
  const wearPhaseSalt = Math.floor(random() * UINT32_RANGE);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const normalizedX = x / width;
    const normalizedY = y / height;
    const broad =
      Math.sin((normalizedX * frequencyA + normalizedY * 0.42) * TAU + phaseA) *
        0.34 +
      Math.sin((normalizedY * frequencyB - normalizedX * 0.31) * TAU + phaseB) *
        0.24 +
      Math.sin((normalizedX + normalizedY) * TAU * 0.55 + phaseC) * 0.18;
    const ironVariation = clampUnit(0.5 + broad);
    const rust = smoothstep(clampUnit((ironVariation - 0.38) / 0.52));
    const grain = coordinateRandom(x, y, grainSalt);
    const grainOffset = (grain - 0.5) * 12;
    let red = 40 + ironVariation * 18 + rust * 50 + grainOffset;
    let green = 34 + ironVariation * 12 + rust * 24 + grainOffset * 0.45;
    let blue = 29 + ironVariation * 9 + rust * 9 + grainOffset * 0.3;
    let roughness = 188 + rust * 42 + (grain - 0.5) * 18;

    if (isWearPixel(x, y, wearSalt, wearPhaseSalt)) {
      red = 142 + grain * 24;
      green = 122 + grain * 21;
      blue = 92 + grain * 18;
      roughness = 151 + grain * 24;
    } else if (coordinateRandom(x, y, pitSalt) > 0.992) {
      red = 22 + grain * 10;
      green = 21 + grain * 8;
      blue = 19 + grain * 7;
      roughness = 238 + grain * 15;
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
  }

  return { colorPixels, roughnessPixels };
};
