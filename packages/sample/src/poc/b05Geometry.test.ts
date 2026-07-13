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
    assert.ok(bar.topY <= archYAtX(bar.x) - B05_BAR_RADIUS + EPSILON);
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
  assert.deepEqual(leaf.archPath[0], [0, archYAtX(0), 0]);
  assert.deepEqual(leaf.archPath.at(-1), [
    B05_LEAF_WIDTH,
    archYAtX(B05_LEAF_WIDTH),
    0,
  ]);

  for (const [x, y, z] of leaf.archPath) {
    assert.ok(x >= leaf.bounds.minX && x <= leaf.bounds.maxX);
    assert.ok(Math.abs(y - archYAtX(x)) <= EPSILON);
    assert.equal(z, 0);
  }
});
