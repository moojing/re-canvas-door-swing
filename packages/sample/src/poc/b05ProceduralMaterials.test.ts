import assert from "node:assert/strict";
import test from "node:test";

import {
  B05_OFFICIAL_APPEARANCE_CONFIG,
  createAgedIronMaterialPixels,
  createAgedIronPixels,
  validateAgedIronInput,
  type AgedIronMaterialPixels,
} from "./b05ProceduralMaterials.ts";

type MaterialGenerator = (
  width: number,
  height: number,
  seed: number,
) => AgedIronMaterialPixels;

type ColorGenerator = (width: number, height: number, seed: number) => Uint8ClampedArray;

const APPEARANCE_WIDTH = B05_OFFICIAL_APPEARANCE_CONFIG.textureSize;
const APPEARANCE_HEIGHT = B05_OFFICIAL_APPEARANCE_CONFIG.textureSize;
const APPEARANCE_SEED = B05_OFFICIAL_APPEARANCE_CONFIG.seed;

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

const pixelLuminance = (pixels: Uint8ClampedArray, index: number): number =>
  pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;

const isPatinaPixel = (pixels: Uint8ClampedArray, index: number): boolean =>
  pixels[index + 1] >= pixels[index] + 2 && pixels[index + 1] >= pixels[index + 2] + 8;

const isOxidationPixel = (pixels: Uint8ClampedArray, index: number): boolean => {
  const red = pixels[index];
  const green = pixels[index + 1];
  const blue = pixels[index + 2];
  return red >= 75 && green >= 45 && red - green >= 18 && red - green <= 45 && green - blue >= 8;
};

const mean = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length;

test("defines the official B05 appearance fixture", () => {
  assert.deepEqual(B05_OFFICIAL_APPEARANCE_CONFIG, {
    textureSize: 128,
    seed: 51,
    textureRepeat: [1, 1],
    worldUnitsPerRepeat: 1.1,
  });
});

test("returns exact RGBA byte buffers for both material maps", () => {
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(16, 8, 51);

  assert.ok(colorPixels instanceof Uint8ClampedArray);
  assert.ok(roughnessPixels instanceof Uint8ClampedArray);
  assert.equal(colorPixels.length, 16 * 8 * 4);
  assert.equal(roughnessPixels.length, 16 * 8 * 4);
});

test("generates deterministic, seed-sensitive color and roughness maps", () => {
  const first = createAgedIronMaterialPixels(64, 64, 51);
  const second = createAgedIronMaterialPixels(64, 64, 51);
  const alternate = createAgedIronMaterialPixels(64, 64, 52);
  const highSeed = createAgedIronMaterialPixels(64, 64, 2 ** 32 + 51);

  assert.deepEqual(first.colorPixels, second.colorPixels);
  assert.deepEqual(first.roughnessPixels, second.roughnessPixels);
  assert.notEqual(checksum(first.colorPixels), checksum(alternate.colorPixels));
  assert.notEqual(checksum(first.roughnessPixels), checksum(alternate.roughnessPixels));
  assert.notEqual(checksum(first.colorPixels), checksum(highSeed.colorPixels));
  assert.notEqual(checksum(first.roughnessPixels), checksum(highSeed.roughnessPixels));
  assert.deepEqual(
    highSeed,
    createAgedIronMaterialPixels(64, 64, 2 ** 32 + 51),
  );
});

test("makes both maps fully opaque and roughness grayscale", () => {
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(16, 8, 51);

  for (let index = 0; index < colorPixels.length; index += 4) {
    assert.equal(colorPixels[index + 3], 255);
    assert.equal(roughnessPixels[index], roughnessPixels[index + 1]);
    assert.equal(roughnessPixels[index], roughnessPixels[index + 2]);
    assert.equal(roughnessPixels[index + 3], 255);
  }
});

test("keeps createAgedIronPixels as a color-map compatibility wrapper", () => {
  const paired = createAgedIronMaterialPixels(32, 24, 51);

  assert.deepEqual(createAgedIronPixels(32, 24, 51), paired.colorPixels);
});

test("aligns charcoal pits and worn scratches with their roughness", () => {
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(
    APPEARANCE_WIDTH,
    APPEARANCE_HEIGHT,
    APPEARANCE_SEED,
  );
  const pitRoughness: number[] = [];
  const scratchRoughness: number[] = [];

  for (let index = 0; index < colorPixels.length; index += 4) {
    const red = colorPixels[index];
    const green = colorPixels[index + 1];
    const blue = colorPixels[index + 2];
    const isCharcoalPit = red <= 42 && green <= 38 && blue <= 34;
    const isWornScratch = red >= 165 && green >= 140 && blue >= 95 && blue <= 150;

    assert.equal(isCharcoalPit && isWornScratch, false);
    if (isCharcoalPit) pitRoughness.push(roughnessPixels[index]);
    if (isWornScratch) scratchRoughness.push(roughnessPixels[index]);
  }

  assert.ok(pitRoughness.length > 0, "fixture has no charcoal pit");
  assert.ok(scratchRoughness.length > 0, "fixture has no worn scratch");
  assert.ok(pitRoughness.every((value) => value >= 225));
  assert.ok(scratchRoughness.every((value) => value >= 140 && value <= 190));

  const pitMean = pitRoughness.reduce((total, value) => total + value, 0) / pitRoughness.length;
  const scratchMean =
    scratchRoughness.reduce((total, value) => total + value, 0) / scratchRoughness.length;
  assert.ok(
    pitMean >= scratchMean + 40,
    `pit mean ${pitMean} is not at least 40 above scratch mean ${scratchMean}`,
  );
});

test("aligns forced contrast repair colors with semantic roughness at 1x2", () => {
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(1, 2, 51);
  const repairedPit = [26, 24, 21];
  const repairedScratch = [186, 160, 116];
  const findPixel = ([red, green, blue]: number[]): number => {
    for (let index = 0; index < colorPixels.length; index += 4) {
      if (
        colorPixels[index] === red &&
        colorPixels[index + 1] === green &&
        colorPixels[index + 2] === blue
      ) {
        return index;
      }
    }

    return -1;
  };
  const pitIndex = findPixel(repairedPit);
  const scratchIndex = findPixel(repairedScratch);

  assert.notEqual(pitIndex, -1, "forced repair did not create a charcoal pit");
  assert.notEqual(scratchIndex, -1, "forced repair did not create a worn scratch");

  const pitRoughness = roughnessPixels[pitIndex];
  const scratchRoughness = roughnessPixels[scratchIndex];
  assert.ok(pitRoughness >= 225, `pit roughness ${pitRoughness} is not matte`);
  assert.ok(
    scratchRoughness >= 140 && scratchRoughness <= 190,
    `scratch roughness ${scratchRoughness} is outside the worn range`,
  );
  assert.ok(pitRoughness >= scratchRoughness + 40);

  for (const index of [pitIndex, scratchIndex]) {
    assert.equal(roughnessPixels[index], roughnessPixels[index + 1]);
    assert.equal(roughnessPixels[index], roughnessPixels[index + 2]);
    assert.equal(roughnessPixels[index + 3], 255);
  }
});

test("provides meaningful roughness variation without fully glossy values", () => {
  const { roughnessPixels } = createAgedIronMaterialPixels(
    APPEARANCE_WIDTH,
    APPEARANCE_HEIGHT,
    APPEARANCE_SEED,
  );
  const values: number[] = [];

  for (let index = 0; index < roughnessPixels.length; index += 4) {
    values.push(roughnessPixels[index]);
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  assert.ok(minimum >= 140, `minimum roughness byte ${minimum} is too glossy`);
  assert.ok(maximum - minimum >= 50, `roughness spread ${maximum - minimum} is too small`);
  assert.ok(new Set(values).size >= 24, "roughness map has too few distinct values");
});

test("keeps the overall iron tone dark wine-red brown", () => {
  const colorPixels = createAgedIronPixels(
    APPEARANCE_WIDTH,
    APPEARANCE_HEIGHT,
    APPEARANCE_SEED,
  );
  let totalLuminance = 0;
  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;
  const pixelCount = colorPixels.length / 4;

  for (let index = 0; index < colorPixels.length; index += 4) {
    totalLuminance += pixelLuminance(colorPixels, index);
    totalRed += colorPixels[index];
    totalGreen += colorPixels[index + 1];
    totalBlue += colorPixels[index + 2];
  }

  const meanLuminance = totalLuminance / pixelCount;
  const meanRed = totalRed / pixelCount;
  const meanGreen = totalGreen / pixelCount;
  const meanBlue = totalBlue / pixelCount;

  assert.ok(meanLuminance <= 56, `mean luminance ${meanLuminance} is too bright`);
  assert.ok(meanRed >= meanGreen + 12, "material is not predominantly wine-red brown");
  assert.ok(meanGreen >= meanBlue + 3, "material has lost its warm brown undertone");
});

test("keeps worn scratches sparse across the material", () => {
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(
    APPEARANCE_WIDTH,
    APPEARANCE_HEIGHT,
    APPEARANCE_SEED,
  );
  let scratchPixels = 0;
  const pixelCount = colorPixels.length / 4;

  for (let index = 0; index < colorPixels.length; index += 4) {
    const isWornHighlight =
      pixelLuminance(colorPixels, index) >= 105 &&
      roughnessPixels[index] >= 140 &&
      roughnessPixels[index] <= 190;
    if (isWornHighlight) scratchPixels += 1;
  }

  const scratchRatio = scratchPixels / pixelCount;
  assert.ok(scratchPixels > 0, "fixture has no worn scratches");
  assert.ok(scratchRatio <= 0.005, `scratch ratio ${scratchRatio} is too dense`);
});

test("forms patina in coherent patches instead of per-pixel salt-and-pepper noise", () => {
  const width = APPEARANCE_WIDTH;
  const height = APPEARANCE_HEIGHT;
  const colorPixels = createAgedIronPixels(width, height, APPEARANCE_SEED);
  const isPatina = (x: number, y: number): boolean => {
    const index = (y * width + x) * 4;
    return isPatinaPixel(colorPixels, index);
  };
  let patinaPixels = 0;
  let isolatedPatinaPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isPatina(x, y)) continue;
      patinaPixels += 1;

      const hasPatinaNeighbor =
        (x > 0 && isPatina(x - 1, y)) ||
        (x + 1 < width && isPatina(x + 1, y)) ||
        (y > 0 && isPatina(x, y - 1)) ||
        (y + 1 < height && isPatina(x, y + 1));
      if (!hasPatinaNeighbor) isolatedPatinaPixels += 1;
    }
  }

  assert.ok(patinaPixels > 0, "fixture has no visible patina");
  const coverage = patinaPixels / (width * height);
  assert.ok(coverage >= 0.005, `patina coverage ${coverage} is below 0.5%`);
  assert.ok(coverage <= 0.015, `patina coverage ${coverage} is above 1.5%`);
  const isolatedRatio = isolatedPatinaPixels / patinaPixels;
  assert.ok(isolatedRatio <= 0.2, `isolated patina ratio ${isolatedRatio} is too high`);
});

test("keeps low-frequency color and roughness variation continuous across texture seams", () => {
  const width = APPEARANCE_WIDTH;
  const height = APPEARANCE_HEIGHT;
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(
    width,
    height,
    APPEARANCE_SEED,
  );
  const indexAt = (x: number, y: number): number => (y * width + x) * 4;
  const difference = (
    pixels: Uint8ClampedArray,
    first: number,
    second: number,
    channels: number,
  ): number => {
    let total = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      total += Math.abs(pixels[first + channel] - pixels[second + channel]);
    }
    return total;
  };
  const seamRatios = (pixels: Uint8ClampedArray, channels: number) => {
    const seamDifferences: number[] = [];
    const internalDifferences: number[] = [];
    const centerDifferences: number[] = [];

    for (let y = 0; y < height; y += 1) {
      seamDifferences.push(difference(pixels, indexAt(width - 1, y), indexAt(0, y), channels));
      centerDifferences.push(difference(pixels, indexAt(63, y), indexAt(64, y), channels));
      for (let x = 0; x < width - 1; x += 1) {
        internalDifferences.push(difference(pixels, indexAt(x, y), indexAt(x + 1, y), channels));
      }
    }
    for (let x = 0; x < width; x += 1) {
      seamDifferences.push(difference(pixels, indexAt(x, height - 1), indexAt(x, 0), channels));
      centerDifferences.push(difference(pixels, indexAt(x, 63), indexAt(x, 64), channels));
      for (let y = 0; y < height - 1; y += 1) {
        internalDifferences.push(difference(pixels, indexAt(x, y), indexAt(x, y + 1), channels));
      }
    }

    const internalMean = mean(internalDifferences);
    return {
      seamRatio: mean(seamDifferences) / internalMean,
      centerRatio: mean(centerDifferences) / internalMean,
    };
  };

  const colorRatios = seamRatios(colorPixels, 3);
  const roughnessRatios = seamRatios(roughnessPixels, 1);
  assert.ok(colorRatios.seamRatio <= 1.75, `color seam ratio ${colorRatios.seamRatio} is too high`);
  assert.ok(
    roughnessRatios.seamRatio <= 1.75,
    `roughness seam ratio ${roughnessRatios.seamRatio} is too high`,
  );
  assert.ok(colorRatios.centerRatio <= 1.75, "color map has a visible center cross");
  assert.ok(roughnessRatios.centerRatio <= 1.75, "roughness map has a visible center cross");
});

test("creates broad connected yellow-brown oxidation regions", () => {
  const width = APPEARANCE_WIDTH;
  const height = APPEARANCE_HEIGHT;
  const colorPixels = createAgedIronPixels(width, height, APPEARANCE_SEED);
  const remaining = new Set<string>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (isOxidationPixel(colorPixels, index)) remaining.add(`${x},${y}`);
    }
  }

  const oxidationPixels = remaining.size;
  let largestRegion = 0;
  while (remaining.size > 0) {
    const start = remaining.values().next().value as string;
    const queue = [start];
    let regionSize = 0;
    remaining.delete(start);

    while (queue.length > 0) {
      const coordinate = queue.pop() as string;
      const [x, y] = coordinate.split(",").map(Number);
      regionSize += 1;
      for (const [offsetX, offsetY] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const neighbor = `${x + offsetX},${y + offsetY}`;
        if (remaining.delete(neighbor)) queue.push(neighbor);
      }
    }
    largestRegion = Math.max(largestRegion, regionSize);
  }

  const coverage = oxidationPixels / (width * height);
  const largestRegionCoverage = largestRegion / (width * height);
  assert.ok(coverage >= 0.2, `oxidation coverage ${coverage} is below 20%`);
  assert.ok(coverage <= 0.45, `oxidation coverage ${coverage} is above 45%`);
  assert.ok(
    largestRegionCoverage >= 0.12,
    `largest oxidation region ${largestRegionCoverage} is below 12%`,
  );
});

test("maps oxidation and patina color regions to appropriately higher roughness", () => {
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(
    APPEARANCE_WIDTH,
    APPEARANCE_HEIGHT,
    APPEARANCE_SEED,
  );
  const baseRoughness: number[] = [];
  const oxidationRoughness: number[] = [];
  const patinaRoughness: number[] = [];

  for (let index = 0; index < colorPixels.length; index += 4) {
    const roughness = roughnessPixels[index];
    if (roughness <= 190 || colorPixels[index] <= 42) continue;
    if (isPatinaPixel(colorPixels, index)) patinaRoughness.push(roughness);
    else if (isOxidationPixel(colorPixels, index)) oxidationRoughness.push(roughness);
    else baseRoughness.push(roughness);
  }

  assert.ok(baseRoughness.length > 0, "fixture has no base iron region");
  assert.ok(oxidationRoughness.length > 0, "fixture has no oxidation region");
  assert.ok(patinaRoughness.length > 0, "fixture has no patina region");
  const baseMean = mean(baseRoughness);
  const oxidationMean = mean(oxidationRoughness);
  const patinaMean = mean(patinaRoughness);
  assert.ok(
    oxidationMean >= baseMean + 12,
    `oxidation roughness ${oxidationMean} is not sufficiently above base ${baseMean}`,
  );
  assert.ok(
    patinaMean >= baseMean + 18,
    `patina roughness ${patinaMean} is not sufficiently above base ${baseMean}`,
  );

  const alignmentScore = (horizontalShift: number): number => {
    const weatheringLevels: number[] = [];
    const sampledRoughness: number[] = [];

    for (let y = 0; y < APPEARANCE_HEIGHT; y += 1) {
      for (let x = 0; x < APPEARANCE_WIDTH; x += 1) {
        const colorIndex = (y * APPEARANCE_WIDTH + x) * 4;
        const red = colorPixels[colorIndex];
        if (red <= 42 || red >= 150) continue;

        const shiftedX = (x + horizontalShift) % APPEARANCE_WIDTH;
        const roughnessIndex = (y * APPEARANCE_WIDTH + shiftedX) * 4;
        weatheringLevels.push(
          isPatinaPixel(colorPixels, colorIndex)
            ? 2
            : isOxidationPixel(colorPixels, colorIndex)
              ? 1
              : 0,
        );
        sampledRoughness.push(roughnessPixels[roughnessIndex]);
      }
    }

    const weatheringMean = mean(weatheringLevels);
    const roughnessMean = mean(sampledRoughness);
    let covariance = 0;
    let weatheringVariance = 0;
    let roughnessVariance = 0;

    for (let index = 0; index < weatheringLevels.length; index += 1) {
      const weatheringDelta = weatheringLevels[index] - weatheringMean;
      const roughnessDelta = sampledRoughness[index] - roughnessMean;
      covariance += weatheringDelta * roughnessDelta;
      weatheringVariance += weatheringDelta * weatheringDelta;
      roughnessVariance += roughnessDelta * roughnessDelta;
    }

    return covariance / Math.sqrt(weatheringVariance * roughnessVariance);
  };
  const assertAligned = (score: number): void => {
    assert.ok(score >= 0.68, `roughness alignment score ${score} is below 0.68`);
  };
  const alignedScore = alignmentScore(0);
  const shiftedControlScore = alignmentScore(8);

  assert.doesNotThrow(() => assertAligned(alignedScore));
  assert.throws(() => assertAligned(shiftedControlScore), /roughness alignment score/);
  assert.ok(
    alignedScore >= shiftedControlScore + 0.1,
    `aligned score ${alignedScore} is not clearly above shifted control ${shiftedControlScore}`,
  );
});

test("keeps dark details visible while providing aged contrast", () => {
  const values = luminances(
    createAgedIronPixels(APPEARANCE_WIDTH, APPEARANCE_HEIGHT, APPEARANCE_SEED),
  );
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
  const width = APPEARANCE_WIDTH;
  const height = APPEARANCE_HEIGHT;
  const scratchRegionSize = 16;
  const pixels = createAgedIronPixels(width, height, APPEARANCE_SEED);
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
  const remaining = new Set(brightPixels);
  const components: Array<Array<[number, number]>> = [];

  while (remaining.size > 0) {
    const start = remaining.values().next().value as string;
    const queue = [start];
    const component: Array<[number, number]> = [];
    remaining.delete(start);

    while (queue.length > 0) {
      const coordinate = queue.pop() as string;
      const [x, y] = coordinate.split(",").map(Number);
      component.push([x, y]);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;

          const neighbor = `${x + offsetX},${y + offsetY}`;
          if (remaining.delete(neighbor)) queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  const scratches = components.filter((component) => component.length >= 3);
  const localCenters = new Set<string>();
  const unclippedScratchLengths = new Set<number>();

  for (const scratch of scratches) {
    const xValues = scratch.map(([x]) => x);
    const yValues = scratch.map(([, y]) => y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const scratchWidth = maxX - minX + 1;
    const scratchHeight = maxY - minY + 1;
    const isUnclippedX =
      scratchWidth === 1 ||
      (minX % scratchRegionSize !== 0 && maxX % scratchRegionSize !== scratchRegionSize - 1);
    const isUnclippedY =
      scratchHeight === 1 ||
      (minY % scratchRegionSize !== 0 && maxY % scratchRegionSize !== scratchRegionSize - 1);

    localCenters.add(`${centerX % scratchRegionSize},${centerY % scratchRegionSize}`);
    if (isUnclippedX && isUnclippedY) {
      unclippedScratchLengths.add(Math.max(scratchWidth, scratchHeight));
    }
  }

  assert.ok(hasHorizontalRun);
  assert.ok(hasVerticalRun);
  assert.ok(hasDiagonalRun);
  assert.ok(coordinates.some(([x]) => x % 13 < 2 || x % 13 > 10));
  assert.ok(scratches.length >= 8, `found only ${scratches.length} scratches`);
  assert.ok(localCenters.size >= 6, `found only ${localCenters.size} local centers`);
  assert.ok(
    unclippedScratchLengths.size >= 2,
    `found only ${unclippedScratchLengths.size} unclipped scratch lengths`,
  );
});

test("both generators reject every invalid dimension and seed with RangeError", () => {
  const invalidDimensions: ReadonlyArray<readonly [number, number]> = [
    [0, 8],
    [8, 0],
    [-1, 8],
    [8, -1],
    [1.5, 8],
    [8, 1.5],
    [Number.NaN, 8],
    [8, Number.POSITIVE_INFINITY],
    [Number.MAX_SAFE_INTEGER + 1, 1],
    [1, Number.MAX_SAFE_INTEGER + 1],
    [1, 1],
    [16_777_217, 1],
  ];
  const invalidSeeds = [
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    1.5,
    Number.MIN_SAFE_INTEGER - 1,
    Number.MAX_SAFE_INTEGER + 1,
  ];
  const generators: ReadonlyArray<MaterialGenerator | ColorGenerator> = [
    createAgedIronMaterialPixels,
    createAgedIronPixels,
  ];

  for (const generator of generators) {
    for (const [width, height] of invalidDimensions) {
      assert.throws(() => generator(width, height, 51), RangeError);
    }
    for (const seed of invalidSeeds) {
      assert.throws(() => generator(8, 8, seed), RangeError);
    }
  }
});

test("both generators accept the minimum two-pixel dimensions", () => {
  for (const [width, height] of [
    [1, 2],
    [2, 1],
  ] as const) {
    assert.equal(createAgedIronPixels(width, height, 51).length, 8);
    const paired = createAgedIronMaterialPixels(width, height, 51);
    assert.equal(paired.colorPixels.length, 8);
    assert.equal(paired.roughnessPixels.length, 8);
  }
});

test("validation accepts the exact pixel limit and rejects the first oversized count", () => {
  assert.doesNotThrow(() => validateAgedIronInput(16_777_216, 1, 51));
  assert.throws(() => validateAgedIronInput(16_777_217, 1, 51), RangeError);
});
