import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { getPortraitHorizontalFit, getPortraitProtectionEnd, hasReferenceHorizontalCrop } from "../../responsiveFraming.ts";

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
  const { pullback, offsetX } = getPortraitHorizontalFit(reference, corners(), aspect);
  assert.ok(pullback > 0);
  reference.position.addScaledVector(reference.getWorldDirection(new THREE.Vector3()), -pullback);
  reference.position.addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(reference.quaternion), offsetX);
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
  assert.ok(getPortraitHorizontalFit(camera(4), corners(), 390 / 844).pullback > 0);
  assert.equal(hasReferenceHorizontalCrop(camera(2), corners()), true);
});

test("lateral camera drift changes horizontal compensation without increasing fit distance", () => {
  const points = corners(3);
  const reference = camera(4);
  const centered = getPortraitHorizontalFit(reference, points, 390 / 844);
  // Truck parallel to the door without changing its authored orientation.
  reference.position.x = 0.7;
  const shifted = getPortraitHorizontalFit(reference, points, 390 / 844);
  assert.ok(Math.abs(centered.pullback - shifted.pullback) < 1e-10);
  assert.ok(Math.abs(shifted.offsetX + 0.7) < 1e-10);
});

test("landscape and comfortably fitting portrait views receive no pullback", () => {
  assert.deepEqual(getPortraitHorizontalFit(camera(), corners(), 1.6), { pullback: 0, offsetX: 0 });
  assert.deepEqual(getPortraitHorizontalFit(camera(), corners(3), 390 / 844), { pullback: 0, offsetX: 0 });
  assert.deepEqual(getPortraitHorizontalFit(camera(5.5), corners(2), 390 / 844), { pullback: 0, offsetX: 0 });
  assert.deepEqual(getPortraitHorizontalFit(camera(), corners(), 768 / 1024), { pullback: 0, offsetX: 0 });
  assert.deepEqual(getPortraitHorizontalFit(camera(), corners(), 0), { pullback: 0, offsetX: 0 });
});

test("fit measurement does not mutate the authored camera or panel points", () => {
  const reference = camera();
  const points = corners();
  const position = reference.position.toArray();
  const projection = reference.projectionMatrix.toArray();
  const coordinates = points.map((point) => point.toArray());
  getPortraitHorizontalFit(reference, points, 390 / 844);
  assert.deepEqual(reference.position.toArray(), position);
  assert.deepEqual(reference.projectionMatrix.toArray(), projection);
  assert.deepEqual(points.map((point) => point.toArray()), coordinates);
});

test("portrait protection covers the approach, closed wait and micro-open hold", () => {
  assert.equal(getPortraitProtectionEnd([{ id: "approach-end", atMs: 1200 },
    { id: "opening-start", atMs: 3120 }, { id: "hold-end", atMs: 3700 }]), 3700);
  assert.equal(getPortraitProtectionEnd([{ id: "closed-hold-end", atMs: 3100 }]), 3100);
  assert.equal(getPortraitProtectionEnd([{ id: "run-start", atMs: 800 }]), 800);
  assert.equal(getPortraitProtectionEnd(), 0);
});

test("fixed portrait dolly retains authored forward displacement and does not release at passage", () => {
  const points = corners();
  const offset = getPortraitHorizontalFit(camera(5), points, 390 / 844).pullback + 0.03;
  const positions = [8, 5, 4.8, 4.5].map(z => {
    const view = camera(z);
    const fit = getPortraitHorizontalFit(view, points, 390 / 844, offset);
    assert.equal(fit.pullback, offset);
    return z + fit.pullback;
  });
  assert.ok(Math.abs(positions[0] - positions[1] - 3) < 1e-10);
  assert.ok(Math.abs(positions[2] - positions[3] - 0.3) < 1e-10);
  // Even opening panels spreading beyond the protected closed bounds must not
  // cause a fresh retreat or a compensating forward jump at the passage marker.
  assert.equal(getPortraitHorizontalFit(camera(4.5), corners(10), 390 / 844, offset).pullback, offset);
});
