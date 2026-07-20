import assert from "node:assert/strict";
import test from "node:test";

import { B05_FRONT_IMAGE } from "./b05FrontImage.ts";
import {
  buildB05FrontResources,
  type B05FrontResources,
} from "./b05FrontResources.ts";
import { startB05FrontLoad } from "./b05FrontLoader.ts";

type FakeImage = {
  onload: ((event: Event) => unknown) | null;
  onerror: ((event: Event | string) => unknown) | null;
  src: string;
};

type FakeResource = {
  disposeCount: number;
  dispose(): void;
};

type FakeTexture = FakeResource & {
  wrapS: unknown;
  wrapT: unknown;
  minFilter: unknown;
  magFilter: unknown;
  flipY: boolean;
  generateMipmaps: boolean;
  encoding: unknown;
};

type FakeMaterial = FakeResource & {
  color: { set(value: number): void };
  transparent: boolean;
  alphaTest: number;
  depthTest: boolean;
  depthWrite: boolean;
  side: unknown;
  toneMapped: boolean;
};

const createDisposable = (): FakeResource => ({
  disposeCount: 0,
  dispose() {
    this.disposeCount += 1;
  },
});

const createResources = (): B05FrontResources<FakeTexture, FakeMaterial> =>
  buildB05FrontResources(
    new Uint8ClampedArray(B05_FRONT_IMAGE.width * B05_FRONT_IMAGE.height * 4),
    {
      textureValues: {
        wrap: "clamp",
        minFilter: "linear",
        magFilter: "linear",
        encoding: "srgb",
      },
      materialValues: { side: "front" },
      createTexture: () => ({
        ...createDisposable(),
        wrapS: null,
        wrapT: null,
        minFilter: null,
        magFilter: null,
        flipY: false,
        generateMipmaps: true,
        encoding: null,
      }),
      createMaterial: () => ({
        ...createDisposable(),
        color: { set() {} },
        transparent: false,
        alphaTest: 0,
        depthTest: false,
        depthWrite: false,
        side: null,
        toneMapped: true,
      }),
    },
  );

const getDisposeCounts = (
  resources: B05FrontResources<FakeTexture, FakeMaterial>,
) => [
  resources.leftTexture.disposeCount,
  resources.rightTexture.disposeCount,
  resources.leftMaterial.disposeCount,
  resources.rightMaterial.disposeCount,
];

const createFakeImage = (events: string[]): FakeImage => {
  let source = "";
  const image: FakeImage = {
    onload: null,
    onerror: null,
    get src() {
      return source;
    },
    set src(value: string) {
      events.push(`src:${value}`);
      assert.equal(typeof image.onload, "function");
      assert.equal(typeof image.onerror, "function");
      source = value;
    },
  };
  return image;
};

test("assigns both handlers before the exact URL and publishes accepted resources", () => {
  const events: string[] = [];
  const image = createFakeImage(events);
  const resources = createResources();
  const published: typeof resources[] = [];

  const cleanup = startB05FrontLoad({
    url: "/base/textures/b05/generated-gate-front.png",
    createImage: () => image,
    createResources: (loadedImage) => {
      assert.equal(loadedImage, image);
      events.push("resources");
      return resources;
    },
    publish: (loadedResources) => {
      events.push("publish");
      published.push(loadedResources);
    },
    onFailure: () => assert.fail("successful loading must not report failure"),
  });

  assert.deepEqual(events, ["src:/base/textures/b05/generated-gate-front.png"]);
  image.onload?.(new Event("load"));
  assert.deepEqual(events, [
    "src:/base/textures/b05/generated-gate-front.png",
    "resources",
    "publish",
  ]);
  assert.deepEqual(published, [resources]);

  cleanup();
  assert.deepEqual(getDisposeCounts(resources), [1, 1, 1, 1]);
});

test("publishes nothing when image loading fails", () => {
  const image = createFakeImage([]);
  let publishCount = 0;
  let resourceCount = 0;
  const cleanup = startB05FrontLoad({
    url: "/failed.png",
    createImage: () => image,
    createResources: () => {
      resourceCount += 1;
      return createResources();
    },
    publish: () => {
      publishCount += 1;
    },
    onFailure: () => {},
  });

  image.onerror?.(new Event("error"));

  assert.equal(resourceCount, 0);
  assert.equal(publishCount, 0);
  cleanup();
});

test("publishes nothing when image processing throws", () => {
  const image = createFakeImage([]);
  const processingError = new Error("processing failed");
  const partialResource = createDisposable();
  let publishCount = 0;
  const failures: unknown[] = [];
  const cleanup = startB05FrontLoad({
    url: "/processing-error.png",
    createImage: () => image,
    createResources: () => {
      partialResource.dispose();
      throw processingError;
    },
    publish: () => {
      publishCount += 1;
    },
    onFailure: (error) => failures.push(error),
  });

  assert.doesNotThrow(() => image.onload?.(new Event("load")));
  image.onload?.(new Event("load"));
  assert.equal(partialResource.disposeCount, 1);
  assert.equal(publishCount, 0);
  assert.deepEqual(failures, [processingError]);
  cleanup();
});

test("reports an image-load failure with asset context exactly once", () => {
  const image = createFakeImage([]);
  const failures: unknown[] = [];
  const cleanup = startB05FrontLoad({
    url: "/base/textures/b05/generated-gate-front.png",
    createImage: () => image,
    createResources,
    publish: () => assert.fail("failed loading must not publish"),
    onFailure: (error) => failures.push(error),
  });

  image.onerror?.(new Event("error"));
  image.onerror?.(new Event("error"));

  assert.equal(failures.length, 1);
  assert.ok(failures[0] instanceof Error);
  assert.match(failures[0].message, /generated front/i);
  assert.match(failures[0].message, /\/base\/textures\/b05\/generated-gate-front\.png/);
  cleanup();
});

test("cleanup clears handlers and cancellation disposes a late resource exactly once", () => {
  const image = createFakeImage([]);
  const lateLoad = () => image.onload?.(new Event("load"));
  const resources = createResources();
  let publishCount = 0;
  const cleanup = startB05FrontLoad({
    url: "/late.png",
    createImage: () => image,
    createResources: () => resources,
    publish: () => {
      publishCount += 1;
    },
    onFailure: (error) => assert.fail(`cancelled loading reported ${String(error)}`),
  });
  const capturedLoad = image.onload;
  const capturedError = image.onerror;

  cleanup();
  cleanup();

  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  lateLoad();
  capturedLoad?.(new Event("load"));
  capturedError?.(new Event("error"));
  assert.equal(publishCount, 0);
  assert.deepEqual(getDisposeCounts(resources), [1, 1, 1, 1]);
});

test("does not publish when the owned controller rejects a second resource bundle", () => {
  const image = createFakeImage([]);
  const first = createResources();
  const duplicate = createResources();
  const queue = [first, duplicate];
  const published: typeof first[] = [];
  const cleanup = startB05FrontLoad({
    url: "/duplicate.png",
    createImage: () => image,
    createResources: () => queue.shift()!,
    publish: (resources) => published.push(resources),
    onFailure: () => assert.fail("accepted resources must not report failure"),
  });

  image.onload?.(new Event("load"));
  image.onload?.(new Event("load"));

  assert.deepEqual(published, [first]);
  assert.deepEqual(getDisposeCounts(first), [0, 0, 0, 0]);
  assert.deepEqual(getDisposeCounts(duplicate), [1, 1, 1, 1]);
  cleanup();
  cleanup();
  assert.deepEqual(getDisposeCounts(first), [1, 1, 1, 1]);
  assert.deepEqual(getDisposeCounts(duplicate), [1, 1, 1, 1]);
});
