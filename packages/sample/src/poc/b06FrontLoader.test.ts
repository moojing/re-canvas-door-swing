import assert from "node:assert/strict";
import test from "node:test";

import { startB06FrontLoad, type B06FrontLoadImage } from "./b06FrontLoader.ts";

class FakeImage implements B06FrontLoadImage {
  onload: ((event: Event) => unknown) | null = null;
  onerror: ((event: Event | string) => unknown) | null = null;
  assigned: string[] = [];

  set src(value: string) {
    assert.ok(this.onload);
    assert.ok(this.onerror);
    this.assigned.push(value);
  }

  get src(): string {
    return this.assigned.at(-1) ?? "";
  }
}

type FakeResources = {
  readonly id: string;
  disposeCount: number;
  dispose(): void;
};

const createResources = (id: string): FakeResources => ({
  id,
  disposeCount: 0,
  dispose() {
    this.disposeCount += 1;
  },
});

test("assigns handlers before URL and publishes one accepted pair", () => {
  const image = new FakeImage();
  const resources = createResources("normal");
  const published: FakeResources[] = [];
  const failures: unknown[] = [];
  const cleanup = startB06FrontLoad({
    url: "/textures/b06/normal.png",
    createImage: () => image,
    createResources: () => resources,
    publish: (value) => published.push(value),
    onFailure: (error) => failures.push(error),
  });

  assert.deepEqual(image.assigned, ["/textures/b06/normal.png"]);
  image.onload?.({} as Event);
  assert.deepEqual(published, [resources]);
  assert.deepEqual(failures, []);
  cleanup();
  assert.equal(resources.disposeCount, 1);
});

test("reports load and processing failures once without publishing", () => {
  for (const mode of ["load", "process"] as const) {
    const image = new FakeImage();
    const published: FakeResources[] = [];
    const failures: unknown[] = [];
    const processingError = new Error("processing failed");
    const cleanup = startB06FrontLoad({
      url: "/textures/b06/frozen.png",
      createImage: () => image,
      createResources: () => {
        throw processingError;
      },
      publish: (value) => published.push(value),
      onFailure: (error) => failures.push(error),
    });

    if (mode === "load") {
      image.onerror?.({} as Event);
      image.onerror?.({} as Event);
      assert.match(String(failures[0]), /frozen\.png/);
    } else {
      image.onload?.({} as Event);
      image.onload?.({} as Event);
      assert.equal(failures[0], processingError);
    }
    assert.equal(failures.length, 1);
    assert.deepEqual(published, []);
    cleanup();
  }
});

test("cleanup rejects and disposes a late resource without publishing", () => {
  const image = new FakeImage();
  const resources = createResources("late");
  const published: FakeResources[] = [];
  const cleanup = startB06FrontLoad({
    url: "/textures/b06/normal.png",
    createImage: () => image,
    createResources: () => resources,
    publish: (value) => published.push(value),
    onFailure: () => undefined,
  });
  const retainedOnload = image.onload;

  cleanup();
  cleanup();
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  retainedOnload?.({} as Event);

  assert.deepEqual(published, []);
  assert.equal(resources.disposeCount, 1);
});

test("switches Normal to Frozen with stale rejection and exact disposal", () => {
  const normalImage = new FakeImage();
  const normal = createResources("normal");
  const staleNormal = createResources("stale-normal");
  const published: FakeResources[] = [];
  let normalBuilds = 0;
  const cleanupNormal = startB06FrontLoad({
    url: "/textures/b06/normal.png",
    createImage: () => normalImage,
    createResources: () => {
      normalBuilds += 1;
      return normalBuilds === 1 ? normal : staleNormal;
    },
    publish: (value) => published.push(value),
    onFailure: () => undefined,
  });
  const retainedNormalOnload = normalImage.onload;

  normalImage.onload?.({} as Event);
  assert.deepEqual(published, [normal]);
  cleanupNormal();
  assert.equal(normal.disposeCount, 1);

  const frozenImage = new FakeImage();
  const frozen = createResources("frozen");
  const cleanupFrozen = startB06FrontLoad({
    url: "/textures/b06/frozen.png",
    createImage: () => frozenImage,
    createResources: () => frozen,
    publish: (value) => published.push(value),
    onFailure: () => undefined,
  });

  retainedNormalOnload?.({} as Event);
  assert.equal(staleNormal.disposeCount, 1);
  assert.deepEqual(published, [normal]);
  frozenImage.onload?.({} as Event);
  assert.deepEqual(published, [normal, frozen]);
  assert.equal(frozen.disposeCount, 0);

  cleanupFrozen();
  assert.equal(frozen.disposeCount, 1);
});
