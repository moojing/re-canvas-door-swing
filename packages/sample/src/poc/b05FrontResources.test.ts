import assert from "node:assert/strict";
import test from "node:test";

import { B05_FRONT_IMAGE } from "./b05FrontImage.ts";
import {
  B05_FRONT_RENDERING,
  buildB05FrontResources,
  createB05FrontResourceController,
  createB05FrontThreeFactories,
  disposeB05FrontResources,
} from "./b05FrontResources.ts";

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
  transparent = false;
  alphaTest = 0;
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
  (y * B05_FRONT_IMAGE.width + x) * 4;

const writePixel = (
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
): void => {
  pixels.set(rgba, pixelIndex(x, y));
};

const createSourcePixels = (): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(
    B05_FRONT_IMAGE.width * B05_FRONT_IMAGE.height * 4,
  );

  writePixel(pixels, 44, 20, [8, 3, 7, 211]);
  writePixel(pixels, 367, 635, [9, 2, 1, 173]);
  writePixel(pixels, 691, 20, [0, 8, 4, 99]);
  writePixel(pixels, 368, 635, [2, 12, 3, 91]);
  return pixels;
};

const createFakeFactories = () => {
  const canvases: FakeCanvas[] = [];
  const factories = createB05FrontThreeFactories(
    THREE_VALUES,
    (pixels, width, height) => {
      const canvas = { pixels, width, height };
      canvases.push(canvas);
      return canvas;
    },
  );

  return { canvases, factories };
};

test("exports the immutable generated-front rendering contract", () => {
  assert.deepEqual(B05_FRONT_RENDERING, {
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
  });
  assert.ok(Object.isFrozen(B05_FRONT_RENDERING));
});

test("builds exact processed crops and applies every rendering setting", () => {
  const source = createSourcePixels();
  const original = source.slice();
  const { canvases, factories } = createFakeFactories();

  const resources = buildB05FrontResources(source, factories);

  assert.equal(canvases.length, 2);
  assert.deepEqual(
    canvases.map(({ width, height }) => ({ width, height })),
    [
      { width: B05_FRONT_IMAGE.leftCrop.width, height: B05_FRONT_IMAGE.leftCrop.height },
      { width: B05_FRONT_IMAGE.rightCrop.width, height: B05_FRONT_IMAGE.rightCrop.height },
    ],
  );

  const leftPixels = canvases[0].pixels;
  const rightPixels = canvases[1].pixels;
  assert.deepEqual(leftPixels.slice(0, 4), new Uint8ClampedArray([8, 3, 7, 0]));
  assert.deepEqual(leftPixels.slice(-4), new Uint8ClampedArray([9, 2, 1, 173]));
  assert.deepEqual(rightPixels.slice(0, 4), new Uint8ClampedArray([0, 8, 4, 0]));
  assert.deepEqual(rightPixels.slice(-4), new Uint8ClampedArray([2, 12, 3, 91]));
  assert.deepEqual(source, original);

  assert.equal(resources.leftTexture.image, canvases[0]);
  assert.equal(resources.rightTexture.image, canvases[1]);
  for (const texture of [resources.leftTexture, resources.rightTexture]) {
    assert.equal(texture.wrapS, THREE_VALUES.ClampToEdgeWrapping);
    assert.equal(texture.wrapT, THREE_VALUES.ClampToEdgeWrapping);
    assert.equal(texture.minFilter, THREE_VALUES.LinearFilter);
    assert.equal(texture.magFilter, THREE_VALUES.LinearFilter);
    assert.equal(texture.flipY, true);
    assert.equal(texture.generateMipmaps, false);
    assert.equal(texture.encoding, THREE_VALUES.sRGBEncoding);
  }

  assert.equal(resources.leftMaterial.parameters.map, resources.leftTexture);
  assert.equal(resources.rightMaterial.parameters.map, resources.rightTexture);
  for (const material of [resources.leftMaterial, resources.rightMaterial]) {
    assert.equal(material.color.value, 0xffffff);
    assert.equal(material.transparent, true);
    assert.equal(material.alphaTest, 0.03);
    assert.equal(material.depthTest, true);
    assert.equal(material.depthWrite, true);
    assert.equal(material.side, THREE_VALUES.FrontSide);
    assert.equal(material.toneMapped, false);
  }
});

test("disposes the first texture exactly once when the second texture throws", () => {
  const firstTexture = new FakeTexture({
    pixels: new Uint8ClampedArray(),
    width: 0,
    height: 0,
  });
  let textureCalls = 0;
  const error = new Error("second texture failed");
  const { factories } = createFakeFactories();

  assert.throws(
    () =>
      buildB05FrontResources(createSourcePixels(), {
        ...factories,
        createTexture: () => {
          textureCalls += 1;
          if (textureCalls === 2) throw error;
          return firstTexture;
        },
      }),
    (caught) => caught === error,
  );
  assert.equal(firstTexture.disposeCount, 1);
});

test("disposes textures and a partial material exactly once when material creation throws", () => {
  const textures: FakeTexture[] = [];
  const materials: FakeMaterial[] = [];
  let materialCalls = 0;
  const error = new Error("second material failed");
  const { factories } = createFakeFactories();

  assert.throws(
    () =>
      buildB05FrontResources(createSourcePixels(), {
        ...factories,
        createTexture: (input) => {
          const texture = factories.createTexture(input);
          textures.push(texture);
          return texture;
        },
        createMaterial: (texture) => {
          materialCalls += 1;
          if (materialCalls === 2) throw error;
          const material = factories.createMaterial(texture);
          materials.push(material);
          return material;
        },
      }),
    (caught) => caught === error,
  );
  assert.deepEqual(textures.map((texture) => texture.disposeCount), [1, 1]);
  assert.deepEqual(materials.map((material) => material.disposeCount), [1]);
});

test("complete resource disposal is idempotent", () => {
  const { factories } = createFakeFactories();
  const resources = buildB05FrontResources(createSourcePixels(), factories);

  disposeB05FrontResources(resources);
  disposeB05FrontResources(resources);

  assert.equal(resources.leftTexture.disposeCount, 1);
  assert.equal(resources.rightTexture.disposeCount, 1);
  assert.equal(resources.leftMaterial.disposeCount, 1);
  assert.equal(resources.rightMaterial.disposeCount, 1);
});

test("accepts resources before cancellation and disposes them on repeated cancellation once", () => {
  const { factories } = createFakeFactories();
  const resources = buildB05FrontResources(createSourcePixels(), factories);
  const controller = createB05FrontResourceController();

  assert.equal(controller.accept(resources), true);
  controller.cancel();
  controller.cancel();

  assert.equal(resources.leftTexture.disposeCount, 1);
  assert.equal(resources.rightTexture.disposeCount, 1);
  assert.equal(resources.leftMaterial.disposeCount, 1);
  assert.equal(resources.rightMaterial.disposeCount, 1);
});

test("disposes late resources immediately after cancellation and rejects them", () => {
  const { factories } = createFakeFactories();
  const resources = buildB05FrontResources(createSourcePixels(), factories);
  const controller = createB05FrontResourceController();

  controller.cancel();
  assert.equal(controller.accept(resources), false);
  controller.cancel();

  assert.equal(resources.leftTexture.disposeCount, 1);
  assert.equal(resources.rightTexture.disposeCount, 1);
  assert.equal(resources.leftMaterial.disposeCount, 1);
  assert.equal(resources.rightMaterial.disposeCount, 1);
});

test("rejects a duplicate acceptance without duplicating disposal", () => {
  const first = buildB05FrontResources(createSourcePixels(), createFakeFactories().factories);
  const duplicate = buildB05FrontResources(
    createSourcePixels(),
    createFakeFactories().factories,
  );
  const controller = createB05FrontResourceController();

  assert.equal(controller.accept(first), true);
  assert.equal(controller.accept(duplicate), false);
  controller.cancel();
  controller.cancel();

  for (const resource of [
    first.leftTexture,
    first.rightTexture,
    first.leftMaterial,
    first.rightMaterial,
    duplicate.leftTexture,
    duplicate.rightTexture,
    duplicate.leftMaterial,
    duplicate.rightMaterial,
  ]) {
    assert.equal(resource.disposeCount, 1);
  }
});

test("cancellation with no resources is an idempotent no-op", () => {
  const controller = createB05FrontResourceController();

  controller.cancel();
  controller.cancel();
});
