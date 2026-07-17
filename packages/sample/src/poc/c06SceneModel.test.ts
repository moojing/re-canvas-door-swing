import assert from "node:assert/strict";
import test from "node:test";
import {
  C06_DURATION_SECONDS,
  C06_EDGE_BRICKS,
  getC06CameraState,
} from "./c06SceneModel.ts";
import { resolveC06TextureUrl } from "./c06TextureUrls.ts";

test("C06 texture URLs use Vite's configured base URL", () => {
  assert.equal(
    resolveC06TextureUrl("/", "textures/c06/aged-brick-albedo.png"),
    "/textures/c06/aged-brick-albedo.png",
  );
  assert.equal(
    resolveC06TextureUrl(
      "/re-canvas-door-swing/",
      "textures/c06/broken-brick-core-albedo.png",
    ),
    "/re-canvas-door-swing/textures/c06/broken-brick-core-albedo.png",
  );
});

test("C06 camera clamps before and after the animation", () => {
  assert.deepEqual(getC06CameraState(-1), getC06CameraState(0));
  assert.deepEqual(
    getC06CameraState(C06_DURATION_SECONDS + 2),
    getC06CameraState(C06_DURATION_SECONDS),
  );
});

test("C06 camera travels monotonically through the wall", () => {
  const samples = Array.from({ length: 17 }, (_, index) =>
    getC06CameraState((C06_DURATION_SECONDS * index) / 16),
  );

  assert.ok(samples[0].z > 0);
  assert.ok(samples[samples.length - 1].z < 0);
  for (let index = 1; index < samples.length; index += 1) {
    assert.ok(samples[index].z <= samples[index - 1].z);
  }
});

test("C06 fades only at the transition boundaries", () => {
  assert.equal(getC06CameraState(0).fadeOpacity, 1);
  for (const interiorTime of [0.5, 1.5, C06_DURATION_SECONDS / 2, 4.4]) {
    assert.equal(getC06CameraState(interiorTime).fadeOpacity, 0);
  }
  assert.equal(getC06CameraState(C06_DURATION_SECONDS).fadeOpacity, 1);
});

test("C06 uses positive three-dimensional brick sizes", () => {
  for (const brick of C06_EDGE_BRICKS) {
    assert.ok(brick.size.every((dimension) => dimension > 0));
  }

  assert.equal(
    new Set(C06_EDGE_BRICKS.map((brick) => brick.size.join("x"))).size,
    1,
  );
});

test("C06 covers every opening side with an asymmetric stepped layout", () => {
  const sideCounts = C06_EDGE_BRICKS.reduce<Record<string, number>>(
    (counts, brick) => ({
      ...counts,
      [brick.side]: (counts[brick.side] ?? 0) + 1,
    }),
    {},
  );

  assert.deepEqual(sideCounts, { top: 9, right: 8, bottom: 8, left: 8 });
  assert.notEqual(sideCounts.top, sideCounts.bottom);

  const ids = C06_EDGE_BRICKS.map((brick) => brick.id);
  const topHeights = C06_EDGE_BRICKS
    .filter((brick) => brick.side === "top")
    .map((brick) => brick.position[1]);
  const rightOffsets = C06_EDGE_BRICKS
    .filter((brick) => brick.side === "right")
    .map((brick) => brick.position[0]);
  const leftOffsets = C06_EDGE_BRICKS
    .filter((brick) => brick.side === "left")
    .map((brick) => Math.abs(brick.position[0]));
  const depths = C06_EDGE_BRICKS.map((brick) => brick.position[2]);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(new Set(topHeights).size > 1);
  assert.ok(new Set(rightOffsets).size > 1);
  assert.notDeepEqual(leftOffsets, rightOffsets);
  assert.ok(new Set(depths).size > 2);
});
