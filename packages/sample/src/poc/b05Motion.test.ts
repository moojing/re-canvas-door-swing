import assert from "node:assert/strict";
import test from "node:test";

import {
  B05_CAMERA_START_Z,
  B05_DURATION_MS,
  B05_MAX_SWING_RADIANS,
  getB05MotionState,
} from "./b05Motion.ts";

test("exports a finite duration and an approximately 85 degree maximum swing", () => {
  assert.ok(Number.isFinite(B05_DURATION_MS));
  assert.ok(B05_DURATION_MS > 0);
  assert.ok(Math.abs(B05_MAX_SWING_RADIANS - (85 * Math.PI) / 180) < 0.001);
});

test("clamps progress to the animation bounds", () => {
  assert.deepEqual(getB05MotionState(-1), getB05MotionState(0));
  assert.deepEqual(getB05MotionState(2), getB05MotionState(1));
  assert.equal(getB05MotionState(-1).progress, 0);
  assert.equal(getB05MotionState(2).progress, 1);
});

test("holds both leaves closed at the start", () => {
  const closed = getB05MotionState(0);
  const holdEnd = getB05MotionState(0.16);

  assert.equal(closed.leftAngle, 0);
  assert.equal(closed.rightAngle, 0);
  assert.equal(holdEnd.leftAngle, 0);
  assert.equal(holdEnd.rightAngle, 0);
});

test("opens both leaves inward with opposite signed angles", () => {
  const opening = getB05MotionState(0.5);
  const open = getB05MotionState(1);

  assert.ok(opening.leftAngle > 0);
  assert.ok(opening.rightAngle < 0);
  assert.equal(opening.leftAngle, -opening.rightAngle);
  assert.equal(open.leftAngle, B05_MAX_SWING_RADIANS);
  assert.equal(open.rightAngle, -B05_MAX_SWING_RADIANS);
});

test("starts forward camera travel only after the leaves reach full clearance", () => {
  const beforeClearance = [0, 0.5, 0.659, 0.66].map(
    (progress) => getB05MotionState(progress).cameraPosition[2]
  );
  const passing = getB05MotionState(0.85);

  assert.deepEqual(beforeClearance, beforeClearance.map(() => B05_CAMERA_START_Z));
  assert.equal(getB05MotionState(0.66).leftAngle, B05_MAX_SWING_RADIANS);
  assert.ok(passing.cameraPosition[2] < B05_CAMERA_START_Z);
});

test("returns finite camera positions and targets throughout the timeline", () => {
  for (let step = 0; step <= 100; step += 1) {
    const state = getB05MotionState(step / 100);

    assert.equal(state.cameraPosition.length, 3);
    assert.equal(state.cameraTarget.length, 3);
    assert.ok([...state.cameraPosition, ...state.cameraTarget].every(Number.isFinite));
  }
});

test("keeps fade bounded and fades fully to black at the end", () => {
  for (let step = 0; step <= 100; step += 1) {
    const fadeOut = getB05MotionState(step / 100).fadeOut;
    assert.ok(fadeOut >= 0 && fadeOut <= 1);
  }

  assert.equal(getB05MotionState(0.92).fadeOut, 0);
  assert.equal(getB05MotionState(1).fadeOut, 1);
});
