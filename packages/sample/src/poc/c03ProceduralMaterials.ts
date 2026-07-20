const pixelIndex = (x: number, y: number, width: number) => (y * width + x) * 4;

const coordinateNoise = (x: number, y: number, seed: number) => {
  let value = Math.imul(x + seed, 374761393) ^ Math.imul(y - seed, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
};

const writePixel = (
  pixels: Uint8ClampedArray,
  index: number,
  red: number,
  green: number,
  blue: number,
  alpha = 255
) => {
  pixels[index] = red;
  pixels[index + 1] = green;
  pixels[index + 2] = blue;
  pixels[index + 3] = alpha;
};

export const createRustPixels = (width: number, height: number) => {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fine = coordinateNoise(x, y, 31);
      const coarse = coordinateNoise(Math.floor(x / 7), Math.floor(y / 7), 83);
      const pitting = coordinateNoise(Math.floor(x / 3), Math.floor(y / 3), 211);
      const oxidation = coordinateNoise(Math.floor(x / 5), Math.floor(y / 5), 137);
      const streak = Math.sin((x + y * 0.35) * 0.12) * 7;
      const brightness = fine * 18 + coarse * 32 + streak;
      let red = 105 + brightness;
      let green = 42 + brightness * 0.42;
      let blue = 24 + brightness * 0.24;

      if (pitting > 0.9) {
        red *= 0.38;
        green *= 0.3;
        blue *= 0.28;
      } else if (oxidation > 0.78) {
        red += 72;
        green += 63;
        blue += 24;
      }

      writePixel(
        pixels,
        pixelIndex(x, y, width),
        red,
        green,
        blue
      );
    }
  }

  return pixels;
};

export const createGridPixels = (width: number, height: number) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const spacing = Math.max(8, Math.round(Math.min(width, height) / 8));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const diagonalA = (x + y) % spacing;
      const diagonalB = (x - y + spacing * height) % spacing;
      const isWire = diagonalA < 2 || diagonalB < 2;
      const noise = coordinateNoise(x, y, 19) * 18;
      const corrosion = coordinateNoise(Math.floor(x / 6), Math.floor(y / 6), 97);
      const red = corrosion > 0.78 ? 125 + noise : 145 + noise;
      const green = corrosion > 0.78 ? 78 + noise * 0.5 : 150 + noise;
      const blue = corrosion > 0.78 ? 44 + noise * 0.3 : 140 + noise * 0.7;
      writePixel(
        pixels,
        pixelIndex(x, y, width),
        red,
        green,
        blue,
        isWire ? 255 : 0
      );
    }
  }

  return pixels;
};

export const createPlatePixels = (width: number, height: number, seed: number) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const cellWidth = Math.max(8, Math.round(width / 8));
  const cellHeight = Math.max(6, Math.round(height / 10));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offsetX = (x + (Math.floor(y / cellHeight) % 2) * (cellWidth / 2)) % cellWidth;
      const offsetY = y % cellHeight;
      const ridge = Math.abs(offsetX - cellWidth / 2) + Math.abs(offsetY - cellHeight / 2);
      const raised = ridge < Math.min(cellWidth, cellHeight) * 0.42;
      const noise = coordinateNoise(x, y, seed) * 16;
      const base = raised ? 145 : 105;
      const scratch = coordinateNoise(x, Math.floor(y / 2), seed + 101) > 0.965;
      const stain = coordinateNoise(Math.floor(x / 6), Math.floor(y / 6), seed + 211) > 0.82;
      let red = base + noise;
      let green = base * 0.68 + noise * 0.45;
      let blue = base * 0.52 + noise * 0.25;

      if (scratch) {
        red = 218 + noise;
        green = 184 + noise * 0.4;
        blue = 142 + noise * 0.2;
      } else if (stain) {
        red *= 0.68;
        green *= 0.54;
        blue *= 0.48;
      }

      writePixel(
        pixels,
        pixelIndex(x, y, width),
        red,
        green,
        blue
      );
    }
  }

  return pixels;
};
