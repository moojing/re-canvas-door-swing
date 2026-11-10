import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { getPortraitHorizontalPullback, getPortraitPullbackWeight, hasReferenceHorizontalCrop } from "../../responsiveFraming.ts";

const corners = (width = 6) => [-width / 2, width / 2].flatMap((x) =>
  [-3, 3].flatMap((y) => [0, 0.162].map((z) => new THREE.Vector3(x, y, z)))
);
const camera = (z = 8, x = 0, y = 0) => {
  const result = new THREE.PerspectiveCamera(60, 1.6, 0.1, 100);
  result.position.set(x, y, z);
  result.lookAt(0, 0, 0);
  result.updateMatrixWorld(true);
  return result;
};

test("portrait pullback fits a complete double door with margin along its viewing axis", () => {
  const reference = camera(8, 0.3, 0.5);
  const originalPosition = reference.position.clone();
  const aspect = 390 / 844;
  const pullback = getPortraitHorizontalPullback(reference, corners(), aspect);
  assert.ok(pullback > 0);
  reference.position.addScaledVector(reference.getWorldDirection(new THREE.Vector3()), -pullback);
  reference.aspect = aspect;
  reference.updateProjectionMatrix();
  reference.updateMatrixWorld(true);
  for (const point of corners()) {
    const projected = point.clone().project(reference);
    assert.ok(Math.abs(projected.x) <= 0.920001);
    assert.ok(Math.abs(projected.y) <= 0.920001);
  }
  assert.ok(reference.position.distanceTo(originalPosition) > 0);
});

test("horizontal reference crop is distinguished from vertical crop", () => {
  assert.equal(hasReferenceHorizontalCrop(camera(4), corners()), false);
  assert.ok(getPortraitHorizontalPullback(camera(4), corners(), 390 / 844) > 0);
  assert.equal(hasReferenceHorizontalCrop(camera(2), corners()), true);
});

test("landscape and comfortably fitting portrait views receive no pullback", () => {
  assert.equal(getPortraitHorizontalPullback(camera(), corners(), 1.6), 0);
  assert.equal(getPortraitHorizontalPullback(camera(), corners(3), 390 / 844), 0);
  assert.equal(getPortraitHorizontalPullback(camera(5.5), corners(2), 390 / 844), 0);
  assert.equal(getPortraitHorizontalPullback(camera(), corners(), 768 / 1024), 0);
  assert.equal(getPortraitHorizontalPullback(camera(), corners(), 0), 0);
});

test("fit measurement does not mutate the authored camera or panel points", () => {
  const reference = camera();
  const points = corners();
  const position = reference.position.toArray();
  const projection = reference.projectionMatrix.toArray();
  const coordinates = points.map((point) => point.toArray());
  getPortraitHorizontalPullback(reference, points, 390 / 844);
  assert.deepEqual(reference.position.toArray(), position);
  assert.deepEqual(reference.projectionMatrix.toArray(), projection);
  assert.deepEqual(points.map((point) => point.toArray()), coordinates);
});

test("portrait protection remains through the closed hold and releases smoothly for passage", () => {
  const events = [{ id: "start", atMs: 0 }, { id: "approach-end", atMs: 1900 },
    { id: "opening-start", atMs: 3350 }, { id: "passage", atMs: 4600 }, { id: "end", atMs: 5650 }];
  const weight = (ms: number) => getPortraitPullbackWeight(ms / 5650, 5650, events);
  assert.equal(weight(0), 1);
  assert.equal(weight(1900), 1);
  assert.equal(weight(3350), 1);
  assert.ok(Math.abs(weight(3975) - 0.5) < 1e-10);
  assert.equal(weight(4600), 0);
  assert.ok(Math.abs(weight(1) - weight(0)) < 1e-6);
  assert.ok(Math.abs(weight(3350.1) - weight(3350)) / 0.1 < 1e-6);
  assert.ok(Math.abs(weight(4599.9) - weight(4600)) / 0.1 < 1e-6);
});
