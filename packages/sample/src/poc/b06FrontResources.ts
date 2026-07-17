import * as THREE from "three";

import {
  B06_FRONT_ASSETS,
  B06_FRONT_CROPS,
  extractB06FrontCrop,
} from "./b06Assets.ts";

export const B06_FRONT_RENDERING = Object.freeze({
  wrap: "clamp-to-edge",
  minFilter: "linear",
  magFilter: "linear",
  flipY: true,
  generateMipmaps: false,
  encoding: "srgb",
  color: 0xffffff,
  transparent: false,
  alphaTest: 0,
  depthTest: true,
  depthWrite: true,
  side: "front",
  toneMapped: false,
} as const);

export type B06DisposableResources = {
  dispose(): void;
};

export type B06FrontTextureInput = Readonly<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}>;

export type B06FrontTextureResource = {
  dispose(): void;
  wrapS: unknown;
  wrapT: unknown;
  minFilter: unknown;
  magFilter: unknown;
  flipY: boolean;
  generateMipmaps: boolean;
  encoding: unknown;
};

export type B06FrontMaterialResource = {
  dispose(): void;
  color: { set(value: number): unknown };
  transparent: boolean;
  alphaTest: number;
  depthTest: boolean;
  depthWrite: boolean;
  side: unknown;
  toneMapped: boolean;
};

type B06FrontResourceSlots<
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
> = {
  leftTexture: Texture;
  rightTexture: Texture;
  leftMaterial: Material;
  rightMaterial: Material;
};

export type B06FrontResources<
  Texture extends B06FrontTextureResource = B06FrontTextureResource,
  Material extends B06FrontMaterialResource = B06FrontMaterialResource,
> = Readonly<B06FrontResourceSlots<Texture, Material> & B06DisposableResources>;

type PartialB06FrontResources<
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
> = Partial<B06FrontResourceSlots<Texture, Material>>;

export type B06FrontFactories<
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
> = Readonly<{
  textureValues: Readonly<{
    wrap: unknown;
    minFilter: unknown;
    magFilter: unknown;
    encoding: unknown;
  }>;
  materialValues: Readonly<{ side: unknown }>;
  createTexture(input: B06FrontTextureInput): Texture;
  createMaterial(texture: Texture): Material;
}>;

type B06ThreeLike<
  Canvas,
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
> = Readonly<{
  ClampToEdgeWrapping: unknown;
  LinearFilter: unknown;
  sRGBEncoding: unknown;
  FrontSide: unknown;
  CanvasTexture: new (canvas: Canvas) => Texture;
  MeshBasicMaterial: new (parameters: { map: Texture }) => Material;
}>;

const createB06FrontDisposer = <
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
>(resources: PartialB06FrontResources<Texture, Material>): (() => void) => {
  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;
    const attempted = new Set<{ dispose(): void }>();
    let firstError: unknown;

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
        firstError ??= error;
      }
    }

    if (firstError !== undefined) throw firstError;
  };
};

export const disposeB06FrontResources = <
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
>(resources: B06FrontResources<Texture, Material>): void => resources.dispose();

const configureTexture = <Texture extends B06FrontTextureResource>(
  texture: Texture,
  values: B06FrontFactories<Texture, B06FrontMaterialResource>["textureValues"],
): void => {
  texture.wrapS = values.wrap;
  texture.wrapT = values.wrap;
  texture.minFilter = values.minFilter;
  texture.magFilter = values.magFilter;
  texture.flipY = B06_FRONT_RENDERING.flipY;
  texture.generateMipmaps = B06_FRONT_RENDERING.generateMipmaps;
  texture.encoding = values.encoding;
};

const configureMaterial = <Material extends B06FrontMaterialResource>(
  material: Material,
  side: unknown,
): void => {
  material.color.set(B06_FRONT_RENDERING.color);
  material.transparent = B06_FRONT_RENDERING.transparent;
  material.alphaTest = B06_FRONT_RENDERING.alphaTest;
  material.depthTest = B06_FRONT_RENDERING.depthTest;
  material.depthWrite = B06_FRONT_RENDERING.depthWrite;
  material.side = side;
  material.toneMapped = B06_FRONT_RENDERING.toneMapped;
};

export const buildB06FrontResources = <
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
>(
  sourcePixels: Uint8ClampedArray,
  factories: B06FrontFactories<Texture, Material>,
): B06FrontResources<Texture, Material> => {
  const partial: PartialB06FrontResources<Texture, Material> = {};
  const dispose = createB06FrontDisposer(partial);

  try {
    const asset = B06_FRONT_ASSETS.normal;
    const leftPixels = extractB06FrontCrop(
      sourcePixels,
      asset.width,
      asset.height,
      B06_FRONT_CROPS.left,
    );
    const rightPixels = extractB06FrontCrop(
      sourcePixels,
      asset.width,
      asset.height,
      B06_FRONT_CROPS.right,
    );

    partial.leftTexture = factories.createTexture({
      pixels: leftPixels,
      width: B06_FRONT_CROPS.left.width,
      height: B06_FRONT_CROPS.left.height,
    });
    configureTexture(partial.leftTexture, factories.textureValues);

    partial.rightTexture = factories.createTexture({
      pixels: rightPixels,
      width: B06_FRONT_CROPS.right.width,
      height: B06_FRONT_CROPS.right.height,
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
      dispose,
    };
  } catch (error) {
    try {
      dispose();
    } catch {
      // Preserve the construction error; cleanup remains best-effort.
    }
    throw error;
  }
};

export const createB06FrontThreeFactories = <
  Canvas,
  Texture extends B06FrontTextureResource,
  Material extends B06FrontMaterialResource,
>(
  three: B06ThreeLike<Canvas, Texture, Material>,
  createCanvas: (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ) => Canvas,
): B06FrontFactories<Texture, Material> => ({
  textureValues: {
    wrap: three.ClampToEdgeWrapping,
    minFilter: three.LinearFilter,
    magFilter: three.LinearFilter,
    encoding: three.sRGBEncoding,
  },
  materialValues: { side: three.FrontSide },
  createTexture: ({ pixels, width, height }) =>
    new three.CanvasTexture(createCanvas(pixels, width, height)),
  createMaterial: (texture) => new three.MeshBasicMaterial({ map: texture }),
});

export type B06ResourceController<Resource extends B06DisposableResources> = Readonly<{
  accept(resources: Resource): boolean;
  cancel(): void;
}>;

export const createB06ResourceController = <
  Resource extends B06DisposableResources,
>(): B06ResourceController<Resource> => {
  let cancelled = false;
  let accepted: Resource | undefined;

  return {
    accept(resources) {
      if (accepted === resources) return false;
      if (cancelled || accepted) {
        resources.dispose();
        return false;
      }
      accepted = resources;
      return true;
    },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      const resources = accepted;
      accepted = undefined;
      resources?.dispose();
    },
  };
};

export const createB06FrontResourceController = <
  Texture extends B06FrontTextureResource = B06FrontTextureResource,
  Material extends B06FrontMaterialResource = B06FrontMaterialResource,
>(): B06ResourceController<B06FrontResources<Texture, Material>> =>
  createB06ResourceController<B06FrontResources<Texture, Material>>();

type B06SourceImage = Readonly<{
  naturalWidth: number;
  naturalHeight: number;
}>;

type B06SourceCanvasContext<Image extends B06SourceImage> = Readonly<{
  drawImage(image: Image, x: number, y: number, width: number, height: number): void;
  getImageData(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Readonly<{ data: Uint8ClampedArray }>;
}>;

type B06SourceCanvas<Image extends B06SourceImage> = {
  width: number;
  height: number;
  getContext(type: "2d"): B06SourceCanvasContext<Image> | null;
};

export const readB06FrontSourcePixels = <
  Image extends B06SourceImage,
  Canvas extends B06SourceCanvas<Image>,
>(image: Image, createCanvas: () => Canvas): Uint8ClampedArray => {
  const asset = B06_FRONT_ASSETS.normal;
  if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) {
    throw new RangeError(`B06 front image must be ${asset.width}x${asset.height}`);
  }

  const canvas = createCanvas();
  canvas.width = asset.width;
  canvas.height = asset.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the B06 front source canvas");
  context.drawImage(image, 0, 0, asset.width, asset.height);
  return context.getImageData(0, 0, asset.width, asset.height).data;
};

const createB06PixelCanvas = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create a B06 front crop canvas");
  const imageData = context.createImageData(width, height);
  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);
  return canvas;
};

export type B06FrontImageSource = CanvasImageSource & B06SourceImage;

export const buildB06FrontResourcesFromImage = (
  image: B06FrontImageSource,
): B06FrontResources<THREE.CanvasTexture, THREE.MeshBasicMaterial> => {
  const pixels = readB06FrontSourcePixels(image, () => document.createElement("canvas"));
  return buildB06FrontResources(
    pixels,
    createB06FrontThreeFactories<
      HTMLCanvasElement,
      THREE.CanvasTexture,
      THREE.MeshBasicMaterial
    >(THREE, createB06PixelCanvas),
  );
};
