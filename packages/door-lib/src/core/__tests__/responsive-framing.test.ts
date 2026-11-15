import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { getPortraitCameraOffset, getPortraitHorizontalFit, getPortraitProtectionEnd, hasReferenceHorizontalCrop } from "../../responsiveFraming.ts";

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

test("portrait passage advances through the doorway without orbiting onto the back of the entering leaf", async () => {
  const { getDoorEntrancePreset } = await import("../presets.ts");
  const { getDoorEntranceAnimationConfig } = await import("../presetAnimation.ts");
  const preset = getDoorEntrancePreset("biohazard-1999-a02-iron-window-door");
  const config = getDoorEntranceAnimationConfig(preset);
  const end = getPortraitProtectionEnd(config.timelineEvents);
  const viewAt = (ms: number) => {
    const state = config.getState(ms / config.duration);
    const view = new THREE.PerspectiveCamera(60, 390 / 844, .1, 100);
    view.position.set(...state.cameraPosition); view.lookAt(...state.cameraTarget); view.updateMatrixWorld(true);
    return view;
  };
  const leafAt = (ms: number) => {
    const angle = -config.getState(ms / config.duration).doorAngle * Math.PI / 2;
    const matrix = new THREE.Matrix4().makeRotationY(angle).setPosition(1.5, 0, 0);
    const points = [-3, 0].flatMap(x => [-3, 3].flatMap(y => [-.002, .162].map(z =>
      new THREE.Vector3(x, y, z).applyMatrix4(matrix))));
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(matrix);
    const face = new THREE.Vector3(-1.5, 0, .162).applyMatrix4(matrix);
    return { points, normal, face };
  };
  const protectedPoints = leafAt(end).points;
  const pullback = Math.max(...Array.from({ length: 97 }, (_, i) => {
    const ms = end * i / 96;
    return getPortraitHorizontalFit(viewAt(ms), leafAt(ms).points, 390 / 844).pullback;
  })) + .03;
  for (let ms = end; ms <= 4800; ms += 20) {
    const view = viewAt(ms), leaf = leafAt(ms);
    assert.ok(leaf.normal.dot(view.position.clone().sub(leaf.face)) > 0, "authored camera remains on approach face");
    view.position.add(getPortraitCameraOffset(view, leaf.points, view.aspect, pullback,
      { camera: viewAt(end), points: protectedPoints, timeMs: ms, protectionEndMs: end }));
    assert.ok(leaf.normal.dot(view.position.clone().sub(leaf.face)) > 0,
      `portrait compensation must not cross the leaf plane at ${ms}ms`);
  }
});

test("post-hold portrait adaptation is continuous and keeps authored movement and orientation", () => {
  const held = camera(5, .2, .7), points = corners(3), aspect = 390 / 844;
  const pullback = getPortraitHorizontalFit(held, points, aspect).pullback + .03;
  const boundary = getPortraitCameraOffset(held, points, aspect, pullback);
  const passage = { camera: held, points, protectionEndMs: 1000, timeMs: 1000.000001 };
  for (const [z, x] of [[5, .2], [4, .4], [3, .7], [2, 1]]) {
    const view = camera(z, x, .7), original = view.position.clone(), orientation = view.quaternion.clone();
    const offset = getPortraitCameraOffset(view, corners(10), aspect, pullback, passage);
    assert.ok(offset.distanceTo(boundary) < 1e-10, "opening geometry and later look direction cannot move the adaptation");
    assert.deepEqual(view.position.toArray(), original.toArray());
    assert.deepEqual(view.quaternion.toArray(), orientation.toArray());
    assert.notEqual(offset, boundary);
  }
});
