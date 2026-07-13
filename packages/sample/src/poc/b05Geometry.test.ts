import assert from "node:assert/strict";
import test from "node:test";

import {
  B05_ARCH_CENTER_X,
  B05_ARCH_CENTER_Y,
  B05_ARCH_RADIUS,
  B05_BAR_RADIUS,
  B05_LEAF_WIDTH,
  B05_TOTAL_HEIGHT,
  archYAtX,
  createB05GateGeometry,
  createB05LeafGeometry,
} from "./b05Geometry.ts";

const EPSILON = 1e-9;

const expectedArchYAtX = (x: number): number =>
  B05_ARCH_CENTER_Y +
  Math.sqrt(B05_ARCH_RADIUS ** 2 - (x - B05_ARCH_CENTER_X) ** 2);

test("uses a canonical leaf with its hinge at x=0", () => {
  const leaf = createB05LeafGeometry();

  assert.deepEqual(leaf.bounds, {
    minX: 0,
    maxX: B05_LEAF_WIDTH,
    minY: 0,
    maxY: B05_TOTAL_HEIGHT,
  });
  assert.equal(B05_ARCH_CENTER_X, B05_LEAF_WIDTH);
  assert.equal(B05_ARCH_RADIUS, B05_LEAF_WIDTH);
  assert.equal(B05_TOTAL_HEIGHT, B05_ARCH_CENTER_Y + B05_ARCH_RADIUS);
});

test("returns exact mirrored gate transforms around the outer hinges", () => {
  const gate = createB05GateGeometry();

  assert.deepEqual(gate.left, {
    hingeX: -B05_LEAF_WIDTH,
    mirrorX: false,
    rotationSign: 1,
  });
  assert.deepEqual(gate.right, {
    hingeX: B05_LEAF_WIDTH,
    mirrorX: true,
    rotationSign: -1,
  });
  assert.equal(gate.left.hingeX, -gate.right.hingeX);
});

test("vertical bars have positive height and stay inside leaf bounds", () => {
  const leaf = createB05LeafGeometry();

  assert.ok(leaf.bars.length >= 3);
  for (const bar of leaf.bars) {
    assert.ok(bar.height > 0);
    assert.ok(bar.x - B05_BAR_RADIUS >= leaf.bounds.minX - EPSILON);
    assert.ok(bar.x + B05_BAR_RADIUS <= leaf.bounds.maxX + EPSILON);
    assert.ok(bar.bottomY >= leaf.bounds.minY);
    assert.ok(bar.topY <= leaf.bounds.maxY);
    assert.ok(Math.abs(bar.topY - bar.bottomY - bar.height) <= EPSILON);
  }
});

test("vertical bars terminate inside the semicircular arch", () => {
  const leaf = createB05LeafGeometry();

  for (const bar of leaf.bars) {
    assert.ok(bar.topY <= expectedArchYAtX(bar.x) - B05_BAR_RADIUS + EPSILON);
  }
});

test("calculates arch endpoints, monotonic height, and the circle equation", () => {
  assert.equal(archYAtX(0), B05_ARCH_CENTER_Y);
  assert.equal(archYAtX(B05_LEAF_WIDTH), B05_TOTAL_HEIGHT);

  const sampleXs = [0, B05_LEAF_WIDTH / 4, B05_LEAF_WIDTH / 2, B05_LEAF_WIDTH];
  const sampleYs = sampleXs.map(archYAtX);

  for (let index = 1; index < sampleYs.length; index += 1) {
    assert.ok(sampleYs[index] > sampleYs[index - 1]);
  }

  for (const [index, x] of sampleXs.entries()) {
    const localX = x - B05_ARCH_CENTER_X;
    const localY = sampleYs[index] - B05_ARCH_CENTER_Y;
    assert.ok(
      Math.abs(localX ** 2 + localY ** 2 - B05_ARCH_RADIUS ** 2) <= EPSILON,
    );
  }
});

test("rejects x outside the canonical leaf domain", () => {
  for (const x of [
    -EPSILON,
    B05_LEAF_WIDTH + EPSILON,
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ]) {
    assert.throws(() => archYAtX(x), RangeError);
  }
});

test("includes bounded panel, divider, and decorative relief blocks", () => {
  const leaf = createB05LeafGeometry();
  const members = [leaf.lowerPanel, leaf.divider, ...leaf.reliefBlocks];

  assert.ok(leaf.reliefBlocks.length >= 2);
  for (const member of members) {
    const [x, y] = member.position;
    const [width, height] = member.size;

    assert.ok(width > 0);
    assert.ok(height > 0);
    assert.ok(x - width / 2 >= leaf.bounds.minX - EPSILON);
    assert.ok(x + width / 2 <= leaf.bounds.maxX + EPSILON);
    assert.ok(y - height / 2 >= leaf.bounds.minY - EPSILON);
    assert.ok(y + height / 2 <= leaf.bounds.maxY + EPSILON);
  }
});

test("samples the arch equation from the outer hinge to the center seam", () => {
  const leaf = createB05LeafGeometry();

  assert.ok(leaf.archPath.length >= 8);
  assert.deepEqual(leaf.archPath[0], [0, B05_ARCH_CENTER_Y, 0]);
  assert.deepEqual(leaf.archPath.at(-1), [B05_LEAF_WIDTH, B05_TOTAL_HEIGHT, 0]);

  for (const [x, y, z] of leaf.archPath) {
    assert.ok(x >= leaf.bounds.minX && x <= leaf.bounds.maxX);
    const localX = x - B05_ARCH_CENTER_X;
    const localY = y - B05_ARCH_CENTER_Y;
    assert.ok(
      Math.abs(localX ** 2 + localY ** 2 - B05_ARCH_RADIUS ** 2) <= EPSILON,
    );
    assert.equal(z, 0);
  }
});

test("samples the arch at uniform angular intervals", () => {
  const angles = createB05LeafGeometry().archPath.map(([x, y]) =>
    Math.atan2(y - B05_ARCH_CENTER_Y, x - B05_ARCH_CENTER_X),
  );
  const expectedStep = -(Math.PI / 2) / (angles.length - 1);

  for (let index = 1; index < angles.length; index += 1) {
    assert.ok(Math.abs(angles[index] - angles[index - 1] - expectedStep) <= EPSILON);
  }
});
