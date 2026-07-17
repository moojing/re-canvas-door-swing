import assert from "node:assert/strict";
import test from "node:test";

import { B06_FRONT_ASSETS, B06_FRONT_CROPS } from "./b06Assets.ts";
import {
  B06_FRONT_RENDERING,
  buildB06FrontResources,
  createB06FrontResourceController,
  createB06FrontThreeFactories,
  disposeB06FrontResources,
  readB06FrontSourcePixels,
} from "./b06FrontResources.ts";

type FakeCanvas = Readonly<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}>;

class FakeTexture {
  readonly image: FakeCanvas;
  wrapS: unknown;
  wrapT: unknown;
  minFilter: unknown;
  magFilter: unknown;
  flipY = false;
  generateMipmaps = true;
  encoding: unknown;
  disposeCount = 0;

  constructor(image: FakeCanvas) {
    this.image = image;
  }

  dispose(): void {
    this.disposeCount += 1;
  }
}

class FakeMaterial {
  readonly parameters: { map: FakeTexture };
  readonly color = {
    value: 0,
    set: (value: number) => {
      this.color.value = value;
    },
  };
  transparent = true;
  alphaTest = 1;
  depthTest = false;
  depthWrite = false;
  side: unknown;
  toneMapped = true;
  disposeCount = 0;

  constructor(parameters: { map: FakeTexture }) {
    this.parameters = parameters;
  }

  dispose(): void {
    this.disposeCount += 1;
  }
}

const THREE_VALUES = Object.freeze({
  ClampToEdgeWrapping: Symbol("ClampToEdgeWrapping"),
  LinearFilter: Symbol("LinearFilter"),
  sRGBEncoding: Symbol("sRGBEncoding"),
  FrontSide: Symbol("FrontSide"),
  CanvasTexture: FakeTexture,
  MeshBasicMaterial: FakeMaterial,
});

const pixelIndex = (x: number, y: number): number =>
  (y * B06_FRONT_ASSETS.normal.width + x) * 4;

const createSourcePixels = (): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(
    B06_FRONT_ASSETS.normal.width * B06_FRONT_ASSETS.normal.height * 4,
  );
  const writePixel = (
    x: number,
    y: number,
    rgba: readonly [number, number, number, number],
  ) => pixels.set(rgba, pixelIndex(x, y));

  writePixel(377, 35, [1, 2, 3, 4]);
  writePixel(786, 964, [11, 12, 13, 14]);
  writePixel(797, 35, [21, 22, 23, 24]);
  writePixel(1206, 964, [31, 32, 33, 34]);
  return pixels;
};

const createFakeFactories = () => {
  const canvases: FakeCanvas[] = [];
  const factories = createB06FrontThreeFactories(
    THREE_VALUES,
    (pixels, width, height) => {
      const canvas = { pixels, width, height };
      canvases.push(canvas);
      return canvas;
    },
  );
  return { canvases, factories };
};

test("exports the immutable opaque front rendering contract", () => {
  assert.deepEqual(B06_FRONT_RENDERING, {
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
  });
  assert.ok(Object.isFrozen(B06_FRONT_RENDERING));
});

test("builds exact opaque crops without changing source bytes", () => {
  const source = createSourcePixels();
  const original = source.slice();
  const { canvases, factories } = createFakeFactories();

  const resources = buildB06FrontResources(source, factories);

  assert.deepEqual(
    canvases.map(({ width, height }) => ({ width, height })),
    [
      { width: B06_FRONT_CROPS.left.width, height: B06_FRONT_CROPS.left.height },
      { width: B06_FRONT_CROPS.right.width, height: B06_FRONT_CROPS.right.height },
    ],
  );
  assert.deepEqual(canvases[0].pixels.slice(0, 4), new Uint8ClampedArray([1, 2, 3, 4]));
  assert.deepEqual(canvases[0].pixels.slice(-4), new Uint8ClampedArray([11, 12, 13, 14]));
  assert.deepEqual(canvases[1].pixels.slice(0, 4), new Uint8ClampedArray([21, 22, 23, 24]));
  assert.deepEqual(canvases[1].pixels.slice(-4), new Uint8ClampedArray([31, 32, 33, 34]));
  assert.deepEqual(source, original);

  for (const texture of [resources.leftTexture, resources.rightTexture]) {
    assert.equal(texture.wrapS, THREE_VALUES.ClampToEdgeWrapping);
    assert.equal(texture.wrapT, THREE_VALUES.ClampToEdgeWrapping);
    assert.equal(texture.minFilter, THREE_VALUES.LinearFilter);
    assert.equal(texture.magFilter, THREE_VALUES.LinearFilter);
    assert.equal(texture.flipY, true);
    assert.equal(texture.generateMipmaps, false);
    assert.equal(texture.encoding, THREE_VALUES.sRGBEncoding);
  }
  for (const material of [resources.leftMaterial, resources.rightMaterial]) {
    assert.equal(material.color.value, 0xffffff);
    assert.equal(material.transparent, false);
    assert.equal(material.alphaTest, 0);
    assert.equal(material.depthTest, true);
    assert.equal(material.depthWrite, true);
    assert.equal(material.side, THREE_VALUES.FrontSide);
    assert.equal(material.toneMapped, false);
  }
});

test("disposes every partial resource when material construction fails", () => {
  const textures: FakeTexture[] = [];
  const materials: FakeMaterial[] = [];
  const buildError = new Error("second material failed");
  const { factories } = createFakeFactories();
  let materialCalls = 0;

  assert.throws(
    () => buildB06FrontResources(createSourcePixels(), {
      ...factories,
      createTexture: (input) => {
        const texture = factories.createTexture(input);
        textures.push(texture);
        return texture;
      },
      createMaterial: (texture) => {
        materialCalls += 1;
        if (materialCalls === 2) throw buildError;
        const material = factories.createMaterial(texture);
        materials.push(material);
        return material;
      },
    }),
    (error) => error === buildError,
  );

  assert.deepEqual(textures.map(({ disposeCount }) => disposeCount), [1, 1]);
  assert.deepEqual(materials.map(({ disposeCount }) => disposeCount), [1]);
});

test("complete disposal and controller cancellation are idempotent", () => {
  const { factories } = createFakeFactories();
  const resources = buildB06FrontResources(createSourcePixels(), factories);
  const controller = createB06FrontResourceController<FakeTexture, FakeMaterial>();

  assert.equal(controller.accept(resources), true);
  controller.cancel();
  controller.cancel();
  disposeB06FrontResources(resources);

  for (const resource of [
    resources.leftTexture,
    resources.rightTexture,
    resources.leftMaterial,
    resources.rightMaterial,
  ]) {
    assert.equal(resource.disposeCount, 1);
  }
});

test("rejects and disposes resources arriving after cancellation", () => {
  const { factories } = createFakeFactories();
  const resources = buildB06FrontResources(createSourcePixels(), factories);
  const controller = createB06FrontResourceController<FakeTexture, FakeMaterial>();

  controller.cancel();
  assert.equal(controller.accept(resources), false);

  for (const resource of [
    resources.leftTexture,
    resources.rightTexture,
    resources.leftMaterial,
    resources.rightMaterial,
  ]) {
    assert.equal(resource.disposeCount, 1);
  }
});

test("validates and reads one browser-decoded RGBA source canvas", () => {
  const pixels = new Uint8ClampedArray(
    B06_FRONT_ASSETS.normal.width * B06_FRONT_ASSETS.normal.height * 4,
  );
  const drawCalls: unknown[][] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (...args: unknown[]) => drawCalls.push(args),
      getImageData: (x: number, y: number, width: number, height: number) => {
        assert.deepEqual([x, y, width, height], [0, 0, 1586, 992]);
        return { data: pixels };
      },
    }),
  };
  const image = { naturalWidth: 1586, naturalHeight: 992 };

  const output = readB06FrontSourcePixels(image, () => canvas);

  assert.equal(output, pixels);
  assert.equal(canvas.width, 1586);
  assert.equal(canvas.height, 992);
  assert.deepEqual(drawCalls, [[image, 0, 0, 1586, 992]]);
  assert.throws(
    () => readB06FrontSourcePixels({ naturalWidth: 1, naturalHeight: 1 }, () => canvas),
    RangeError,
  );
  assert.throws(
    () => readB06FrontSourcePixels(image, () => ({ ...canvas, getContext: () => null })),
    /source canvas/,
  );
});
