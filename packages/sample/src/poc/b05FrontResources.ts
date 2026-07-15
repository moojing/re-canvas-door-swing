import * as THREE from "three";

import {
  B05_FRONT_IMAGE,
  extractB05FrontCrop,
  removeB05NearBlackBackground,
} from "./b05FrontImage.ts";

export const B05_FRONT_RENDERING = Object.freeze({
  wrap: "clamp-to-edge",
  minFilter: "linear",
  magFilter: "linear",
  flipY: true,
  generateMipmaps: false,
  encoding: "srgb",
  color: 0xffffff,
  transparent: true,
  alphaTest: 0.03,
  depthTest: true,
  depthWrite: true,
  side: "front",
  toneMapped: false,
} as const);

export type B05FrontTextureInput = Readonly<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}>;

export type B05Disposable = {
  dispose(): void;
};

export type B05FrontTextureResource = B05Disposable & {
  wrapS: unknown;
  wrapT: unknown;
  minFilter: unknown;
  magFilter: unknown;
  flipY: boolean;
  generateMipmaps: boolean;
  encoding: unknown;
};

export type B05FrontMaterialResource = B05Disposable & {
  color: { set(value: number): unknown };
  transparent: boolean;
  alphaTest: number;
  depthTest: boolean;
  depthWrite: boolean;
  side: unknown;
  toneMapped: boolean;
};

const disposeB05FrontResourcesSymbol = Symbol("disposeB05FrontResources");

type B05FrontResourceSlots<
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
> = {
  leftTexture: Texture;
  rightTexture: Texture;
  leftMaterial: Material;
  rightMaterial: Material;
};

export type B05FrontResources<
  Texture extends B05FrontTextureResource = B05FrontTextureResource,
  Material extends B05FrontMaterialResource = B05FrontMaterialResource,
> = Readonly<
  B05FrontResourceSlots<Texture, Material> & {
    [disposeB05FrontResourcesSymbol](): void;
  }
>;

type PartialB05FrontResources<
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
> = Partial<B05FrontResourceSlots<Texture, Material>>;

export type B05FrontFactories<
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
> = Readonly<{
  textureValues: Readonly<{
    wrap: unknown;
    minFilter: unknown;
    magFilter: unknown;
    encoding: unknown;
  }>;
  materialValues: Readonly<{
    side: unknown;
  }>;
  createTexture(input: B05FrontTextureInput): Texture;
  createMaterial(texture: Texture): Material;
}>;

type B05ThreeLike<
  Canvas,
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
> = Readonly<{
  ClampToEdgeWrapping: unknown;
  LinearFilter: unknown;
  sRGBEncoding: unknown;
  FrontSide: unknown;
  CanvasTexture: new (canvas: Canvas) => Texture;
  MeshBasicMaterial: new (parameters: { map: Texture }) => Material;
}>;

const createB05FrontDisposer = <
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
>(resources: PartialB05FrontResources<Texture, Material>): (() => void) => {
  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;

    const attempted = new Set<B05Disposable>();
    let firstError: unknown;
    let cleanupFailed = false;

    for (const resource of [
      resources.leftMaterial,
      resources.rightMaterial,
      resources.leftTexture,
      resources.rightTexture,
    ]) {
      if (!resource || attempted.has(resource)) continue;
      attempted.add(resource);

      try {
        resource.dispose();
      } catch (error) {
        if (!cleanupFailed) {
          firstError = error;
          cleanupFailed = true;
        }
      }
    }

    if (cleanupFailed) throw firstError;
  };
};

export const disposeB05FrontResources = <
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
>(resources: B05FrontResources<Texture, Material>): void =>
  resources[disposeB05FrontResourcesSymbol]();

const configureTexture = <Texture extends B05FrontTextureResource>(
  texture: Texture,
  values: B05FrontFactories<Texture, B05FrontMaterialResource>["textureValues"],
): void => {
  texture.wrapS = values.wrap;
  texture.wrapT = values.wrap;
  texture.minFilter = values.minFilter;
  texture.magFilter = values.magFilter;
  texture.flipY = B05_FRONT_RENDERING.flipY;
  texture.generateMipmaps = B05_FRONT_RENDERING.generateMipmaps;
  texture.encoding = values.encoding;
};

const configureMaterial = <Material extends B05FrontMaterialResource>(
  material: Material,
  side: unknown,
): void => {
  material.color.set(B05_FRONT_RENDERING.color);
  material.transparent = B05_FRONT_RENDERING.transparent;
  material.alphaTest = B05_FRONT_RENDERING.alphaTest;
  material.depthTest = B05_FRONT_RENDERING.depthTest;
  material.depthWrite = B05_FRONT_RENDERING.depthWrite;
  material.side = side;
  material.toneMapped = B05_FRONT_RENDERING.toneMapped;
};

export const buildB05FrontResources = <
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
>(
  sourcePixels: Uint8ClampedArray,
  factories: B05FrontFactories<Texture, Material>,
): B05FrontResources<Texture, Material> => {
  const partial: PartialB05FrontResources<Texture, Material> = {};
  const disposePartial = createB05FrontDisposer(partial);

  try {
    const processedPixels = removeB05NearBlackBackground(sourcePixels);
    const leftPixels = extractB05FrontCrop(
      processedPixels,
      B05_FRONT_IMAGE.width,
      B05_FRONT_IMAGE.height,
      B05_FRONT_IMAGE.leftCrop,
    );
    const rightPixels = extractB05FrontCrop(
      processedPixels,
      B05_FRONT_IMAGE.width,
      B05_FRONT_IMAGE.height,
      B05_FRONT_IMAGE.rightCrop,
    );

    partial.leftTexture = factories.createTexture({
      pixels: leftPixels,
      width: B05_FRONT_IMAGE.leftCrop.width,
      height: B05_FRONT_IMAGE.leftCrop.height,
    });
    configureTexture(partial.leftTexture, factories.textureValues);

    partial.rightTexture = factories.createTexture({
      pixels: rightPixels,
      width: B05_FRONT_IMAGE.rightCrop.width,
      height: B05_FRONT_IMAGE.rightCrop.height,
    });
    configureTexture(partial.rightTexture, factories.textureValues);

    partial.leftMaterial = factories.createMaterial(partial.leftTexture);
    configureMaterial(partial.leftMaterial, factories.materialValues.side);

    partial.rightMaterial = factories.createMaterial(partial.rightTexture);
    configureMaterial(partial.rightMaterial, factories.materialValues.side);

    return {
      leftTexture: partial.leftTexture,
      rightTexture: partial.rightTexture,
      leftMaterial: partial.leftMaterial,
      rightMaterial: partial.rightMaterial,
      [disposeB05FrontResourcesSymbol]: disposePartial,
    };
  } catch (error) {
    try {
      disposePartial();
    } catch {
      // The build error is the actionable failure; cleanup remains best-effort.
    }
    throw error;
  }
};

export const createB05FrontThreeFactories = <
  Canvas,
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
>(
  three: B05ThreeLike<Canvas, Texture, Material>,
  createCanvas: (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ) => Canvas,
): B05FrontFactories<Texture, Material> => ({
  textureValues: {
    wrap: three.ClampToEdgeWrapping,
    minFilter: three.LinearFilter,
    magFilter: three.LinearFilter,
    encoding: three.sRGBEncoding,
  },
  materialValues: {
    side: three.FrontSide,
  },
  createTexture: ({ pixels, width, height }) =>
    new three.CanvasTexture(createCanvas(pixels, width, height)),
  createMaterial: (texture) => new three.MeshBasicMaterial({ map: texture }),
});

export type B05FrontResourceController<
  Texture extends B05FrontTextureResource,
  Material extends B05FrontMaterialResource,
> = Readonly<{
  accept(resources: B05FrontResources<Texture, Material>): boolean;
  cancel(): void;
}>;

export const createB05FrontResourceController = <
  Texture extends B05FrontTextureResource = B05FrontTextureResource,
  Material extends B05FrontMaterialResource = B05FrontMaterialResource,
>(): B05FrontResourceController<Texture, Material> => {
  let cancelled = false;
  let acceptedResources: B05FrontResources<Texture, Material> | undefined;

  return {
    accept(resources) {
      if (acceptedResources === resources) return false;

      if (cancelled || acceptedResources) {
        disposeB05FrontResources(resources);
        return false;
      }

      acceptedResources = resources;
      return true;
    },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      const resources = acceptedResources;
      acceptedResources = undefined;
      if (resources) disposeB05FrontResources(resources);
    },
  };
};

const createB05PixelCanvas = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create a B05 front crop canvas");

  const imageData = context.createImageData(width, height);
  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);
  return canvas;
};

export type B05FrontImageSource = CanvasImageSource &
  Readonly<{
    naturalWidth: number;
    naturalHeight: number;
  }>;

export const buildB05FrontResourcesFromImage = (
  image: B05FrontImageSource,
): B05FrontResources<THREE.CanvasTexture, THREE.MeshBasicMaterial> => {
  if (
    image.naturalWidth !== B05_FRONT_IMAGE.width ||
    image.naturalHeight !== B05_FRONT_IMAGE.height
  ) {
    throw new RangeError(
      `B05 front image must be ${B05_FRONT_IMAGE.width}x${B05_FRONT_IMAGE.height}`,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = B05_FRONT_IMAGE.width;
  canvas.height = B05_FRONT_IMAGE.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the B05 front source canvas");

  context.drawImage(image, 0, 0, B05_FRONT_IMAGE.width, B05_FRONT_IMAGE.height);
  const sourcePixels = context.getImageData(
    0,
    0,
    B05_FRONT_IMAGE.width,
    B05_FRONT_IMAGE.height,
  ).data;

  return buildB05FrontResources(
    sourcePixels,
    createB05FrontThreeFactories<
      HTMLCanvasElement,
      THREE.CanvasTexture,
      THREE.MeshBasicMaterial
    >(THREE, createB05PixelCanvas),
  );
};
