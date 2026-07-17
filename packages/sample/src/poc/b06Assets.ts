export type B06Variant = "normal" | "frozen";

export type B06FrontCrop = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

const normalAsset = Object.freeze({
  publicPath: "textures/b06/normal.png",
  width: 1586,
  height: 992,
  sha256: "a6a9c27a179d836a98f5b21ac9c43e20300e1c43bced2ec9f092fd8ac0157f04",
} as const);

const frozenAsset = Object.freeze({
  publicPath: "textures/b06/frozen.png",
  width: 1586,
  height: 992,
  sha256: "669cbc0e47df1adfdb3955fcc898f9ce322ea1651f88337d9f31dceeeeeeab3d",
} as const);

export const B06_FRONT_ASSETS = Object.freeze({
  normal: normalAsset,
  frozen: frozenAsset,
} as const);

const leftCrop = Object.freeze({ x: 377, y: 35, width: 410, height: 930 } as const);
const rightCrop = Object.freeze({ x: 797, y: 35, width: 410, height: 930 } as const);

export const B06_FRONT_CROPS = Object.freeze({
  left: leftCrop,
  right: rightCrop,
} as const);

export const B06_LEAF_HEIGHT = 6;
export const B06_LEAF_WIDTH = (B06_LEAF_HEIGHT * leftCrop.width) / leftCrop.height;
export const B06_MEMBER_DEPTH = 0.18;

export const B06_WHEEL_COVER = Object.freeze({
  center: Object.freeze([
    (200 / leftCrop.height) * B06_LEAF_HEIGHT,
    B06_LEAF_HEIGHT / 2 - (505 / leftCrop.height) * B06_LEAF_HEIGHT,
    0.16,
  ] as const),
  bakedRadiusPixels: 94,
  radius: 0.64,
  wheelRadius: 0.5,
} as const);

export const B06_HANDLE = Object.freeze({
  cropCenter: Object.freeze([220, 505] as const),
  localCenter: Object.freeze([
    ((220 - leftCrop.width) / leftCrop.height) * B06_LEAF_HEIGHT,
    B06_LEAF_HEIGHT / 2 - (505 / leftCrop.height) * B06_LEAF_HEIGHT,
    0.18,
  ] as const),
  barSize: Object.freeze([
    (28 / leftCrop.height) * B06_LEAF_HEIGHT,
    (250 / leftCrop.height) * B06_LEAF_HEIGHT,
    0.16,
  ] as const),
  mountSize: Object.freeze([
    (76 / leftCrop.height) * B06_LEAF_HEIGHT,
    (54 / leftCrop.height) * B06_LEAF_HEIGHT,
    0.2,
  ] as const),
  mountOffsetY: (125 / leftCrop.height) * B06_LEAF_HEIGHT,
} as const);

export const resolveB06FrontUrl = (
  baseUrl: string,
  variant: B06Variant,
): string => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${B06_FRONT_ASSETS[variant].publicPath}`;
};

const isPositiveInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

const assertCompleteRgbaPixels = (source: Uint8ClampedArray): void => {
  if (source.length % 4 !== 0) {
    throw new RangeError("B06 front source must contain complete RGBA pixels");
  }
};

export const extractB06FrontCrop = (
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  crop: B06FrontCrop,
): Uint8ClampedArray => {
  assertCompleteRgbaPixels(source);

  const sourcePixelCount = sourceWidth * sourceHeight;
  if (
    !isPositiveInteger(sourceWidth) ||
    !isPositiveInteger(sourceHeight) ||
    !Number.isSafeInteger(sourcePixelCount) ||
    source.length !== sourcePixelCount * 4
  ) {
    throw new RangeError("B06 front dimensions must match the RGBA source");
  }

  if (
    !Number.isSafeInteger(crop.x) ||
    crop.x < 0 ||
    !Number.isSafeInteger(crop.y) ||
    crop.y < 0 ||
    !isPositiveInteger(crop.width) ||
    !isPositiveInteger(crop.height) ||
    crop.x > sourceWidth - crop.width ||
    crop.y > sourceHeight - crop.height
  ) {
    throw new RangeError("B06 front crop must stay within the source bounds");
  }

  const output = new Uint8ClampedArray(crop.width * crop.height * 4);
  const rowLength = crop.width * 4;
  for (let destinationY = 0; destinationY < crop.height; destinationY += 1) {
    const sourceStart = ((crop.y + destinationY) * sourceWidth + crop.x) * 4;
    output.set(
      source.subarray(sourceStart, sourceStart + rowLength),
      destinationY * rowLength,
    );
  }
  return output;
};
