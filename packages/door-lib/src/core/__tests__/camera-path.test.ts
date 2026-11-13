import assert from "node:assert/strict";
import { test } from "node:test";
import { getAnimationSetProfile } from "../animationSets.ts";
import { getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";
import { sampleTrack } from "../animationTimeline.ts";
import type { CameraPath } from "../cameraPath.ts";

const path = (): CameraPath => ({
  position: [{ atMs: 0, value: [0, 0, 8], easing: "ease-in" },
    { atMs: 500, value: [2, 4, 6], easing: "ease-out" }, { atMs: 1000, value: [3, 5, 1] }],
  target: [{ atMs: 0, value: [0, 0, 0] }, { atMs: 1000, value: [1, 0, 0] }],
});

test("sets resolve an internal cameraPath and keep distinct traversals and derived targets", () => {
  const iron = getAnimationSetProfile(getDoorEntrancePreset("biohazard-1996-a01-iron-door"));
  assert.ok("cameraPath" in iron, "Camera tracks must resolve as their own internal data");
  const leave = getAnimationSetProfile(getDoorEntrancePreset("biohazard-1996-a01-iron-door-leave"));
  const yellow = getAnimationSetProfile(getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door"));
  assert.notDeepEqual(iron.cameraPath, leave.cameraPath);
  assert.deepEqual(iron.cameraPath.target, yellow.cameraPath.target);
  assert.notDeepEqual(iron.cameraPath.position, yellow.cameraPath.position);
  assert.equal("cameraPosition" in iron, false);
  assert.equal("cameraTarget" in iron, false);
});

test("cameraPath sampling preserves interpolation, clamps time and returns detached tuples", async () => {
  const { sampleCameraPath } = await import("../cameraPath.ts");
  const source = path(), before = structuredClone(source);
  for (const ms of [-10, 0, 1, 250, 499, 500, 501, 750, 1000, 1100]) {
    assert.deepEqual(sampleCameraPath(source, 1000, ms), {
      cameraPosition: sampleTrack(source.position, 1000, ms),
      cameraTarget: sampleTrack(source.target, 1000, ms),
    });
  }
  assert.deepEqual(sampleCameraPath(source, 1000, 250).cameraPosition, [0.5, 1, 7.5]);
  const result = sampleCameraPath(source, 1000, 0);
  result.cameraPosition[2] = 99; result.cameraTarget[0] = 99;
  assert.deepEqual(source, before);
});

test("cameraPath retiming preserves easing and never aliases vectors back to the source", async () => {
  const { retimeCameraPath, sampleCameraPath } = await import("../cameraPath.ts");
  const source = path(), before = structuredClone(source);
  const changed = retimeCameraPath(source, [0, 500, 1000], [0, 800, 1000]);
  assert.deepEqual(changed.position.map(f => f.atMs), [0, 800, 1000]);
  assert.equal(changed.position[0].easing, "ease-in");
  assert.equal(changed.position[1].easing, "ease-out");
  assert.deepEqual(sampleCameraPath(changed, 1000, 400).cameraPosition,
    sampleCameraPath(source, 1000, 250).cameraPosition);
  changed.position[0].value[2] = 100;
  changed.target[0].value[0] = 100;
  assert.deepEqual(source, before);
  assert.throws(() => retimeCameraPath(source, [0, 500, 1000], [0, 900, 800]), /strict time order/);
});

test("cameraPath validation rejects invalid vectors and incomplete tracks", async () => {
  const { validateCameraPath } = await import("../cameraPath.ts");
  validateCameraPath(path(), 1000);
  for (const value of [[0, NaN, 0], [0, Infinity, 0], [0, 0], 3]) {
    const invalid = structuredClone(path());
    invalid.position[0].value = value as [number, number, number];
    assert.throws(() => validateCameraPath(invalid, 1000));
  }
  const invalid = path();
  assert.throws(() => validateCameraPath({ ...invalid, target: [] }, 1000));
  assert.throws(() => validateCameraPath(invalid, 1200));
});

test("phase retiming still coordinates the extracted path with leaf, handle, sound and fade", () => {
  const preset = getDoorEntrancePreset("biohazard-1999-a02-iron-window-door");
  const original = getDoorEntranceAnimationConfig(preset);
  const changed = getDoorEntranceAnimationConfig(preset, { "opening-start": 2100 });
  assert.equal(changed.soundStartProgress! * changed.duration, 2100);
  assert.equal(original.soundStartProgress! * original.duration, 2160);
  assert.equal(changed.timelineEvents!.find(e => e.id === "opening-start")!.atMs, 2100);
  assert.deepEqual(changed.getState(2100 / changed.duration), original.getState(2160 / original.duration));
  assert.equal(changed.soundEndProgress, original.soundEndProgress);
  assert.equal(changed.getState(1).fadeOut, original.getState(1).fadeOut);
});
