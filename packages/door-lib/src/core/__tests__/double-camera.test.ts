import assert from "node:assert/strict";
import { test } from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";

const preset = getDoorEntrancePreset("biohazard-1996-b02-blue-panel-double-door");
const config = getDoorEntranceAnimationConfig(preset);
const at = (ms: number) => config.getState(ms / config.duration);
const marker = (id: string) => config.timelineEvents!.find((event) => event.id === id)!.atMs;
const cameraAt = (ms: number) => {
  const state = at(ms);
  const camera = new PerspectiveCamera(60, 1.6, 0.1, 100);
  camera.position.set(...state.cameraPosition);
  camera.lookAt(...state.cameraTarget);
  camera.updateMatrixWorld();
  return camera;
};

test("blue double approach crops the bottom while retaining the top, like S3", () => {
  const camera = cameraAt(marker("approach-end"));
  const top = new Vector3(-3, 3, 0).project(camera).y;
  const bottom = new Vector3(-3, -3, 0).project(camera).y;
  assert.ok(top > 0.65 && top < 1, `top projection ${top}`);
  assert.ok(bottom < -1.05, `bottom projection ${bottom}`);
  assert.equal(at(marker("approach-end")).doorAngle, 0);
});

test("blue double pauses briefly then advances continuously without a passage speed jump", () => {
  const slight = marker("slight-open");
  const resume = marker("hold-end");
  assert.ok(resume - slight <= 250, "S3 does not support the old half-second hold");
  assert.deepEqual(at(slight).cameraPosition, at(resume).cameraPosition);
  assert.equal(at(slight).doorAngle, at(resume).doorAngle);
  const z = (ms: number) => at(ms).cameraPosition[2];
  let previousStep = 0;
  for (let ms = resume; ms + 25 <= config.duration; ms += 25) {
    const step = z(ms) - z(ms + 25);
    assert.ok(step > 0 && step < 0.15, `camera jumps/stops at ${ms}`);
    assert.ok(Math.abs(step - previousStep) < 0.012, `camera speed changes at ${ms}`);
    assert.ok(at(ms + 25).doorAngle > at(ms).doorAngle, `leaf stops at ${ms}`);
    previousStep = step;
  }
});

test("blue double opens away with broad faces still in frame when fading begins", () => {
  assert.equal(preset.swingDirection, "away-from-viewer");
  const ms = marker("fade-start");
  const state = at(ms);
  const camera = cameraAt(ms);
  for (const [side, angle] of [[-1, state.doorAngle], [1, state.rightDoorAngle!]] as const) {
    // Each three-unit leaf swings away from its outer hinge at x=±3.
    const theta = angle * Math.PI / 2;
    const hinge = new Vector3(side * 3, 0, 0).project(camera).x;
    const free = new Vector3(side * (3 - 3 * Math.cos(theta)), 0,
      -3 * Math.sin(theta)).project(camera).x;
    assert.ok(Math.abs(hinge) < 1, "hinge has already left the frame");
    assert.ok(Math.abs(free - hinge) / 2 > 0.25, "broad face must remain visible");
    assert.ok(Math.abs(free) < 0.2, "center gap is too wide");
  }
  assert.equal(state.fadeOut, 0);
  assert.equal(at(config.duration).fadeOut, 1);
});

test("S3 opens only the left leaf while the right leaf remains closed throughout", () => {
  for (let ms = 0; ms <= config.duration; ms += 25) {
    assert.equal(at(ms).rightDoorAngle, 0, `right leaf rotates at ${ms} ms`);
  }
  assert.ok(at(marker("fade-start")).doorAngle > 0);
});

test("blue opening sound starts with leaf motion and lasts until fade begins", () => {
  assert.equal(config.soundStartProgress, marker("opening-start") / config.duration);
  assert.equal(config.soundEndProgress, marker("fade-start") / config.duration);
});
