import assert from "node:assert/strict";
import test from "node:test";

import { getC03MotionState } from "./c03Motion.ts";

const distance = ([x, y, z]: readonly number[]) => Math.hypot(x, y, z);

test("clamps progress to the animation bounds", () => {
  assert.deepEqual(getC03MotionState(-1), getC03MotionState(0));
  assert.deepEqual(getC03MotionState(2), getC03MotionState(1));
});

test("moves from a far view through a close view and back out", () => {
  const start = getC03MotionState(0);
  const middle = getC03MotionState(0.5);
  const end = getC03MotionState(1);

  assert.ok(distance(middle.cameraPosition) < distance(start.cameraPosition));
  assert.ok(Math.abs(distance(start.cameraPosition) - distance(end.cameraPosition)) < 0.001);
});

test("returns finite camera coordinates throughout the timeline", () => {
  for (let step = 0; step <= 20; step += 1) {
    const state = getC03MotionState(step / 20);
    assert.ok([...state.cameraPosition, ...state.cameraTarget].every(Number.isFinite));
  }
});
