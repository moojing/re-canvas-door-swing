export type B05FrontCrop = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  flipX: boolean;
}>;

const leftCrop = Object.freeze({
  x: 44,
  y: 20,
  width: 324,
  height: 616,
  flipX: false,
} as const);

const rightCrop = Object.freeze({
  x: 368,
  y: 20,
  width: 324,
  height: 616,
  flipX: true,
} as const);

export const B05_FRONT_IMAGE = Object.freeze({
  publicPath: "textures/b05/generated-gate-front.png",
  width: 758,
  height: 636,
  sha256: "f00e7e6f0844077dc2a930027db3d8dd40b34341d56320b197cd1855ad4cb77b",
  alphaThreshold: 8,
  leftCrop,
  rightCrop,
} as const);

export const B05_FRONT_PLANE = Object.freeze({
  size: Object.freeze([2.7, 5.35] as const),
  position: Object.freeze([1.35, 2.675, 0.22] as const),
} as const);

export const resolveB05FrontUrl = (baseUrl: string): string =>
  `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}${B05_FRONT_IMAGE.publicPath}`;

const assertCompleteRgbaPixels = (source: Uint8ClampedArray): void => {
  if (source.length % 4 !== 0) {
    throw new RangeError("B05 front image source must contain complete RGBA pixels");
  }
};

export const removeB05NearBlackBackground = (
  source: Uint8ClampedArray,
): Uint8ClampedArray => {
  assertCompleteRgbaPixels(source);

  const output = source.slice();
  for (let index = 0; index < output.length; index += 4) {
    if (
      Math.max(output[index], output[index + 1], output[index + 2]) <=
      B05_FRONT_IMAGE.alphaThreshold
    ) {
      output[index + 3] = 0;
    }
  }
  return output;
};

const isPositiveInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

export const extractB05FrontCrop = (
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  crop: B05FrontCrop,
): Uint8ClampedArray => {
  assertCompleteRgbaPixels(source);

  const sourcePixelCount = sourceWidth * sourceHeight;
  if (
    !isPositiveInteger(sourceWidth) ||
    !isPositiveInteger(sourceHeight) ||
    !Number.isSafeInteger(sourcePixelCount) ||
    source.length !== sourcePixelCount * 4
  ) {
    throw new RangeError("B05 front image dimensions must match the RGBA source");
  }

  if (
    !Number.isSafeInteger(crop.x) ||
    crop.x < 0 ||
    !Number.isSafeInteger(crop.y) ||
    crop.y < 0 ||
    !isPositiveInteger(crop.width) ||
    !isPositiveInteger(crop.height) ||
    crop.width > sourceWidth ||
    crop.height > sourceHeight ||
    crop.x > sourceWidth - crop.width ||
    crop.y > sourceHeight - crop.height
  ) {
    throw new RangeError("B05 front image crop must stay within the source bounds");
  }

  const output = new Uint8ClampedArray(crop.width * crop.height * 4);
  for (let destinationY = 0; destinationY < crop.height; destinationY += 1) {
    for (let destinationX = 0; destinationX < crop.width; destinationX += 1) {
      const sourceX = crop.flipX
        ? crop.x + crop.width - 1 - destinationX
        : crop.x + destinationX;
      const sourceIndex = ((crop.y + destinationY) * sourceWidth + sourceX) * 4;
      const destinationIndex = (destinationY * crop.width + destinationX) * 4;
      output.set(source.subarray(sourceIndex, sourceIndex + 4), destinationIndex);
    }
  }

  return output;
};
