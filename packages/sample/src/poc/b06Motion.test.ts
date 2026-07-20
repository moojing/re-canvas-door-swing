import assert from "node:assert/strict";
import test from "node:test";

import {
  B06_CAMERA_START_Z,
  B06_DURATION_MS,
  B06_MAX_SWING_RADIANS,
  B06_WHEEL_MAX_RADIANS,
  getB06MotionState,
} from "./b06Motion.ts";

const approximatelyEqual = (actual: number, expected: number, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
};

test("exports finite B06 timing and motion constants", () => {
  assert.ok(Number.isFinite(B06_DURATION_MS));
  assert.ok(B06_DURATION_MS > 0);
  approximatelyEqual(B06_MAX_SWING_RADIANS, (85 * Math.PI) / 180);
  approximatelyEqual(B06_WHEEL_MAX_RADIANS, -1.25 * Math.PI);
  assert.equal(B06_CAMERA_START_Z, 8);
});

test("clamps finite and non-finite progress to safe bounds", () => {
  assert.equal(getB06MotionState(-1).progress, 0);
  assert.equal(getB06MotionState(Number.NaN).progress, 0);
  assert.equal(getB06MotionState(Number.NEGATIVE_INFINITY).progress, 0);
  assert.equal(getB06MotionState(2).progress, 1);
  assert.equal(getB06MotionState(Number.POSITIVE_INFINITY).progress, 1);
});

test("holds wheel and leaves still at the beginning", () => {
  const state = getB06MotionState(0);
  assert.equal(state.wheelAngle, 0);
  assert.equal(state.leftAngle, 0);
  assert.equal(state.rightAngle, 0);
  assert.deepEqual(state.cameraPosition, [0, 0, 8]);
  assert.deepEqual(state.cameraTarget, [0, 0, -3]);
  assert.equal(state.fadeOut, 0);
});

test("completes valve rotation before either leaf opens", () => {
  const wheelMoving = getB06MotionState(0.1);
  assert.ok(wheelMoving.wheelAngle < 0);
  assert.ok(wheelMoving.wheelAngle > B06_WHEEL_MAX_RADIANS);
  assert.equal(wheelMoving.leftAngle, 0);
  assert.equal(wheelMoving.rightAngle, 0);

  const wheelComplete = getB06MotionState(0.18);
  approximatelyEqual(wheelComplete.wheelAngle, B06_WHEEL_MAX_RADIANS);
  assert.equal(wheelComplete.leftAngle, 0);
  assert.equal(wheelComplete.rightAngle, 0);
  assert.equal(getB06MotionState(0.2).leftAngle, 0);
});

test("opens both leaves inward with exact mirrored angles", () => {
  for (const progress of [0.21, 0.35, 0.5, 0.65, 1]) {
    const state = getB06MotionState(progress);
    approximatelyEqual(state.rightAngle, -state.leftAngle);
    assert.ok(state.leftAngle >= 0);
    assert.ok(state.leftAngle <= B06_MAX_SWING_RADIANS);
  }

  const complete = getB06MotionState(0.65);
  approximatelyEqual(complete.leftAngle, B06_MAX_SWING_RADIANS);
  approximatelyEqual(complete.rightAngle, -B06_MAX_SWING_RADIANS);
});

test("starts camera travel only after full door clearance", () => {
  assert.deepEqual(getB06MotionState(0.65).cameraPosition, [0, 0, 8]);
  const moving = getB06MotionState(0.8).cameraPosition;
  assert.ok(moving[2] < 8);
  assert.ok(moving[2] > -2.5);
  assert.deepEqual(getB06MotionState(0.92).cameraPosition, [0, 0, -2.5]);
  assert.deepEqual(getB06MotionState(1).cameraPosition, [0, 0, -2.5]);
});

test("keeps fade bounded and fades only after camera travel", () => {
  assert.equal(getB06MotionState(0.92).fadeOut, 0);
  assert.ok(getB06MotionState(0.96).fadeOut > 0);
  assert.ok(getB06MotionState(0.96).fadeOut < 1);
  assert.equal(getB06MotionState(1).fadeOut, 1);
});

test("returns finite vectors and bounded values across the timeline", () => {
  for (let step = 0; step <= 100; step += 1) {
    const state = getB06MotionState(step / 100);
    for (const value of [
      state.wheelAngle,
      state.leftAngle,
      state.rightAngle,
      ...state.cameraPosition,
      ...state.cameraTarget,
      state.fadeOut,
    ]) {
      assert.ok(Number.isFinite(value));
    }
    assert.ok(state.fadeOut >= 0 && state.fadeOut <= 1);
  }
});
