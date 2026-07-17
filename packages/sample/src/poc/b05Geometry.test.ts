import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  createB05BoxMaterialSlots,
  ownB05HiddenFrontMaterial,
  selectB05BoxMaterialSlots,
} from "./b05BoxMaterialSlots.ts";
import {
  B05_ARCH_CENTER_X,
  B05_ARCH_CENTER_Y,
  B05_ARCH_RADIUS,
  B05_BAR_COUNT,
  B05_BAR_RADIUS,
  B05_LEAF_WIDTH,
  B05_PANEL_HEIGHT,
  B05_STILE_WIDTH,
  B05_TOTAL_HEIGHT,
  archYAtX,
  createB05GateGeometry,
  createB05LeafGeometry,
} from "./b05Geometry.ts";
import { B05_FRONT_PLANE } from "./b05FrontImage.ts";
import {
  B05_WORLD_UNITS_PER_TEXTURE_REPEAT,
  projectB05TextureUv,
} from "./b05TextureMapping.ts";

const EPSILON = 1e-9;

const expectedArchYAtX = (x: number): number =>
  B05_ARCH_CENTER_Y +
  Math.sqrt(B05_ARCH_RADIUS ** 2 - (x - B05_ARCH_CENTER_X) ** 2);

test("suppresses only the BoxGeometry +Z face when generated fronts are active", () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const agedMaterial = { id: "aged" };
  const hiddenFrontMaterial = { id: "hidden-front" };
  const generatedFrontSlots = createB05BoxMaterialSlots(
    agedMaterial,
    hiddenFrontMaterial,
  );

  const normals = geometry.getAttribute("normal");
  const indices = geometry.getIndex();
  assert.ok(indices);

  for (const group of geometry.groups) {
    assert.notEqual(group.materialIndex, undefined);
    const groupNormals = new Set<string>();

    for (let offset = group.start; offset < group.start + group.count; offset += 1) {
      const vertexIndex = indices.getX(offset);
      groupNormals.add([
        normals.getX(vertexIndex),
        normals.getY(vertexIndex),
        normals.getZ(vertexIndex),
      ].join(","));
    }

    assert.equal(groupNormals.size, 1);
    const [normal] = groupNormals;
    const material = generatedFrontSlots[group.materialIndex];

    if (normal === "0,0,1") {
      assert.equal(material, hiddenFrontMaterial);
    } else {
      assert.equal(material, agedMaterial, `unexpected hidden face normal ${normal}`);
    }
  }

  geometry.dispose();
});

test("selects fallback slots without hiding any face when front resources are null", () => {
  const agedMaterial = { id: "aged" };
  const hiddenFrontMaterial = { id: "hidden-front" };
  const fallback = createB05BoxMaterialSlots(agedMaterial);
  const generated = createB05BoxMaterialSlots(agedMaterial, hiddenFrontMaterial);
  const fallbackSelection = selectB05BoxMaterialSlots(null, {
    fallback,
    generated,
  });
  const generatedSelection = selectB05BoxMaterialSlots({}, {
    fallback,
    generated,
  });

  assert.ok(fallbackSelection.every((material) => material === agedMaterial));
  assert.equal(generatedSelection[4], hiddenFrontMaterial);
  assert.equal(
    generatedSelection.filter((material) => material === agedMaterial).length,
    5,
  );
});

test("disposes an owned hidden-front material exactly once", () => {
  const material = new THREE.MeshBasicMaterial({ visible: false });
  const originalDispose = material.dispose.bind(material);
  let disposeCount = 0;
  material.dispose = () => {
    disposeCount += 1;
    originalDispose();
  };

  const owner = ownB05HiddenFrontMaterial(material);

  assert.equal(owner.material, material);
  owner.dispose();
  owner.dispose();
  owner.dispose();
  assert.equal(disposeCount, 1);
});

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
  assert.deepEqual(B05_FRONT_PLANE.size, [B05_LEAF_WIDTH, B05_TOTAL_HEIGHT]);
  assert.deepEqual(B05_FRONT_PLANE.position, [
    B05_LEAF_WIDTH / 2,
    B05_TOTAL_HEIGHT / 2,
    0.22,
  ]);
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

test("matches the approved framed gate leaf structure", () => {
  const leaf = createB05LeafGeometry();
  const members = [
    leaf.lowerPanel,
    leaf.panelInset,
    leaf.lowerRail,
    leaf.middleRail,
    leaf.outerStile,
    leaf.centerStile,
    ...leaf.panelTrim,
  ];

  assert.equal(leaf.bars.length, B05_BAR_COUNT);
  assert.equal(B05_BAR_COUNT, 4);
  assert.equal(leaf.panelTrim.length, 4);
  assert.equal(leaf.barCollars.length, 3);
  assert.equal(leaf.plaqueTrim.length, 6);
  assert.ok(B05_PANEL_HEIGHT / B05_TOTAL_HEIGHT >= 0.28);
  assert.ok(leaf.panelInset.size[0] < leaf.lowerPanel.size[0]);
  assert.ok(leaf.panelInset.size[1] < leaf.lowerPanel.size[1]);
  assert.ok(leaf.panelInset.position[2] > leaf.lowerPanel.position[2]);
  assert.equal(leaf.outerStile.size[0], B05_STILE_WIDTH);
  assert.equal(leaf.centerStile.size[0], B05_STILE_WIDTH);
  assert.equal(leaf.centerStile.size[1], B05_TOTAL_HEIGHT);
  assert.ok(leaf.middleRail.position[1] > leaf.lowerRail.position[1]);

  for (const collar of leaf.barCollars) {
    const [x, y] = collar.position;
    assert.ok(collar.radius > B05_BAR_RADIUS);
    assert.ok(collar.height > 0);
    assert.ok(x - collar.radius >= leaf.bounds.minX);
    assert.ok(x + collar.radius <= leaf.bounds.maxX);
    assert.ok(y - collar.height / 2 >= leaf.bounds.minY);
    assert.ok(y + collar.height / 2 <= leaf.bounds.maxY);
  }

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

  for (const edge of leaf.plaqueTrim) {
    const [x, y] = edge.position;
    assert.ok(edge.rotation?.every(Number.isFinite));
    assert.ok(edge.size.every((value) => value > 0));
    assert.ok(x >= leaf.bounds.minX && x <= leaf.bounds.maxX);
    assert.ok(y >= leaf.bounds.minY && y <= B05_PANEL_HEIGHT);
  }
});

test("projects different members into one consistent world-scale texture space", () => {
  const leftMemberUv = projectB05TextureUv([0.5, 1.2, 0], [0, 0, 0]);
  const offsetMemberUv = projectB05TextureUv([-0.5, 1.2, 0], [1, 0, 0]);
  const oneRepeatUv = projectB05TextureUv(
    [B05_WORLD_UNITS_PER_TEXTURE_REPEAT, B05_WORLD_UNITS_PER_TEXTURE_REPEAT, 0],
    [0, 0, 0],
  );

  assert.deepEqual(leftMemberUv, offsetMemberUv);
  assert.deepEqual(oneRepeatUv, [1, 1]);
  assert.ok(B05_WORLD_UNITS_PER_TEXTURE_REPEAT <= 1.2);
});

test("extends the grille below the middle rail while keeping it above the solid panel", () => {
  const leaf = createB05LeafGeometry();
  const lowerRailTop = leaf.lowerRail.position[1] + leaf.lowerRail.size[1] / 2;
  const middleRailY = leaf.middleRail.position[1];

  for (const bar of leaf.bars) {
    assert.ok(Math.abs(bar.bottomY - lowerRailTop) <= EPSILON);
    assert.ok(bar.bottomY < middleRailY);
    assert.ok(bar.topY > middleRailY);
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
