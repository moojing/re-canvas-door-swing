import assert from "node:assert/strict";
import test from "node:test";

import {
  B06_HANDLE,
  B06_LEAF_HEIGHT,
  B06_LEAF_WIDTH,
  B06_MEMBER_DEPTH,
  B06_WHEEL_COVER,
} from "./b06Assets.ts";
import { createB06SceneDescriptor } from "./b06Scene.ts";

const approximatelyEqual = (actual: number, expected: number, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
};

test("describes exactly two moving leaves and no environment", () => {
  const scene = createB06SceneDescriptor<symbol>(null);

  assert.deepEqual(Object.keys(scene), ["leaves"]);
  assert.equal(scene.leaves.length, 2);
  assert.deepEqual(scene.leaves.map(({ side }) => side), ["left", "right"]);
  for (const leaf of scene.leaves) {
    assert.deepEqual(leaf.parents, ["hinge", "leaf"]);
    assert.deepEqual(leaf.scale, [1, 1, 1]);
    assert.equal(leaf.front, null);
    assert.equal("environment" in leaf, false);
    assert.equal("frame" in leaf, false);
    assert.equal("threshold" in leaf, false);
    assert.equal("fullPairPlane" in leaf, false);
  }
});

test("places outer hinges so the closed leaf bounds meet exactly at x zero", () => {
  const { leaves: [left, right] } = createB06SceneDescriptor<symbol>(null);

  assert.equal(left.hingeX, -B06_LEAF_WIDTH);
  assert.deepEqual(left.localBounds, {
    minX: 0,
    maxX: B06_LEAF_WIDTH,
    minY: -B06_LEAF_HEIGHT / 2,
    maxY: B06_LEAF_HEIGHT / 2,
  });
  assert.equal(right.hingeX, B06_LEAF_WIDTH);
  assert.deepEqual(right.localBounds, {
    minX: -B06_LEAF_WIDTH,
    maxX: 0,
    minY: -B06_LEAF_HEIGHT / 2,
    maxY: B06_LEAF_HEIGHT / 2,
  });
  approximatelyEqual(left.hingeX + left.localBounds.maxX, 0);
  approximatelyEqual(right.hingeX + right.localBounds.minX, 0);

  assert.deepEqual(left.box, {
    size: [B06_LEAF_WIDTH, B06_LEAF_HEIGHT, B06_MEMBER_DEPTH],
    position: [B06_LEAF_WIDTH / 2, 0, 0],
  });
  assert.deepEqual(right.box, {
    size: [B06_LEAF_WIDTH, B06_LEAF_HEIGHT, B06_MEMBER_DEPTH],
    position: [-B06_LEAF_WIDTH / 2, 0, 0],
  });
});

test("attaches unmirrored front planes to the correct hinge descendants", () => {
  const leftMaterial = Symbol("normal-left");
  const rightMaterial = Symbol("normal-right");
  const { leaves: [left, right] } = createB06SceneDescriptor({
    leftMaterial,
    rightMaterial,
  });

  assert.deepEqual(left.front, {
    material: leftMaterial,
    size: [B06_LEAF_WIDTH, B06_LEAF_HEIGHT],
    position: [B06_LEAF_WIDTH / 2, 0, B06_MEMBER_DEPTH / 2 + 0.002],
    localBounds: left.localBounds,
    uv: { minU: 0, maxU: 1, increasingU: true },
    parents: ["hinge", "leaf"],
  });
  assert.deepEqual(right.front, {
    material: rightMaterial,
    size: [B06_LEAF_WIDTH, B06_LEAF_HEIGHT],
    position: [-B06_LEAF_WIDTH / 2, 0, B06_MEMBER_DEPTH / 2 + 0.002],
    localBounds: right.localBounds,
    uv: { minU: 0, maxU: 1, increasingU: true },
    parents: ["hinge", "leaf"],
  });
});

test("keeps normal and frozen geometry identical apart from material identity", () => {
  const normal = createB06SceneDescriptor({ leftMaterial: "normal-l", rightMaterial: "normal-r" });
  const frozen = createB06SceneDescriptor({ leftMaterial: "frozen-l", rightMaterial: "frozen-r" });

  for (let index = 0; index < 2; index += 1) {
    const { front: normalFront, ...normalGeometry } = normal.leaves[index];
    const { front: frozenFront, ...frozenGeometry } = frozen.leaves[index];
    assert.deepEqual(normalGeometry, frozenGeometry);
    assert.deepEqual(
      normalFront && { ...normalFront, material: null },
      frozenFront && { ...frozenFront, material: null },
    );
  }
});

test("covers the baked wheel and keeps animated wheel inside the left leaf", () => {
  const { leaves: [left, right] } = createB06SceneDescriptor<symbol>(null);
  const bakedRadiusWorld = (B06_WHEEL_COVER.bakedRadiusPixels / 930) * 6;

  assert.deepEqual(left.wheelBacking, {
    position: B06_WHEEL_COVER.center,
    radius: B06_WHEEL_COVER.radius,
    depth: 0.08,
    parents: ["hinge", "leaf"],
  });
  assert.deepEqual(left.wheel, {
    position: B06_WHEEL_COVER.center,
    radius: B06_WHEEL_COVER.wheelRadius,
    depth: 0.14,
    parents: ["hinge", "leaf", "wheel"],
  });
  assert.ok(left.wheelBacking.radius > bakedRadiusWorld);
  assert.ok(left.wheelBacking.radius > left.wheel.radius);
  assert.equal(right.wheelBacking, null);
  assert.equal(right.wheel, null);
});

test("places the measured static pull handle inside the right leaf", () => {
  const { leaves: [left, right] } = createB06SceneDescriptor<symbol>(null);

  assert.equal(left.handle, null);
  assert.deepEqual(right.handle, {
    center: B06_HANDLE.localCenter,
    barSize: B06_HANDLE.barSize,
    mounts: [
      {
        position: [
          B06_HANDLE.localCenter[0],
          B06_HANDLE.localCenter[1] + B06_HANDLE.mountOffsetY,
          B06_HANDLE.localCenter[2],
        ],
        size: B06_HANDLE.mountSize,
      },
      {
        position: [
          B06_HANDLE.localCenter[0],
          B06_HANDLE.localCenter[1] - B06_HANDLE.mountOffsetY,
          B06_HANDLE.localCenter[2],
        ],
        size: B06_HANDLE.mountSize,
      },
    ],
    parents: ["hinge", "leaf"],
  });
});
