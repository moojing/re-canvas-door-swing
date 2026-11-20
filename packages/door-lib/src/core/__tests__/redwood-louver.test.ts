import assert from "node:assert/strict";
import { test } from "node:test";
import { getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";
import { getHandleTurnMultiplier, usesRectangularKnobPlate, usesSteelKnobLook } from "../renderLook.ts";

for (const traversal of ["enter", "leave"] as const) {
  test(`redwood ${traversal} keeps the inactive leaf and knob stationary throughout passage`, () => {
    const preset = getDoorEntrancePreset(traversal === "enter"
      ? "biohazard-1998-b04-redwood-louver-door" : "biohazard-1998-b04-redwood-louver-door-leave");
    const config = getDoorEntranceAnimationConfig(preset);
    const state = (ms: number) => config.getState(ms / config.duration);
    assert.equal(preset.traversal, traversal);
    assert.equal(preset.handleTurnDirection, traversal === "enter" ? "clockwise" : "counterclockwise");
    assert.equal(getHandleTurnMultiplier(preset.handleTurnDirection!, "front"), traversal === "enter" ? -1 : 1);
    assert.equal(preset.swingDirection, traversal === "enter" ? "away-from-viewer" : "toward-viewer");
    assert.ok(usesRectangularKnobPlate(preset.id));
    assert.ok(usesSteelKnobLook(preset.id));
    assert.match(preset.frontTextureUrl!, /redwood-louver-leaf.webp$/);
    assert.equal(preset.backTextureUrl, preset.frontTextureUrl);
    assert.equal(preset.textureFlipY, true);
    assert.deepEqual(state(0).cameraPosition, state(2080).cameraPosition);
    for (let ms = 0; ms <= config.duration; ms += 40) {
      const frame = state(ms);
      assert.equal(traversal === "enter" ? frame.doorAngle : frame.rightDoorAngle, 0);
      assert.equal(traversal === "enter" ? frame.handleAngle : frame.rightHandleAngle, 0);
    }
    assert.equal(state(2000).doorAngle, 0);
    assert.equal(state(2000).rightDoorAngle, 0);
    assert.ok((traversal === "enter" ? state(2000).rightHandleAngle! : state(2000).handleAngle!) > 0);
    assert.ok((traversal === "enter" ? state(3500).rightDoorAngle! : state(3500).doorAngle) > 0.4);
    assert.ok(state(config.duration).cameraPosition[2] < state(0).cameraPosition[2]);
    assert.equal(state(config.duration).fadeOut, 1);
    assert.equal(config.soundStartProgress, 2080 / config.duration);
  });
}


test("redwood second passage turns the left knob counterclockwise half a turn before opening", () => {
  const preset = getDoorEntrancePreset("biohazard-1998-b04-redwood-louver-door-leave");
  const config = getDoorEntranceAnimationConfig(preset);
  const state = (ms: number) => config.getState(ms / config.duration);
  assert.equal(preset.handleTurnDirection, "counterclockwise");
  assert.equal(state(1760).handleAngle, 0);
  assert.equal(state(1920).handleAngle, Math.PI / 2);
  assert.equal(state(2080).handleAngle, Math.PI);
  assert.equal(state(2080).doorAngle, 0);
  assert.ok(state(2120).doorAngle > 0);
  assert.equal(state(2560).handleAngle, Math.PI);
  assert.equal(state(2080).rightHandleAngle, 0);
  assert.equal(getHandleTurnMultiplier(preset.handleTurnDirection!, "front"), 1);
  assert.equal(getHandleTurnMultiplier(preset.handleTurnDirection!, "back"), -1);
  const enter = getDoorEntranceAnimationConfig(getDoorEntrancePreset("biohazard-1998-b04-redwood-louver-door"));
  assert.equal(enter.getState(2080 / enter.duration).rightHandleAngle, 35 * Math.PI / 180);
});


for (const traversal of ["enter", "leave"] as const) {
  test(`redwood ${traversal} micro-opens, pauses, fully opens, then advances`, () => {
    const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(traversal === "enter"
      ? "biohazard-1998-b04-redwood-louver-door" : "biohazard-1998-b04-redwood-louver-door-leave"));
    const state = (ms: number) => config.getState(ms / config.duration);
    const angle = (ms: number) => traversal === "enter" ? state(ms).rightDoorAngle : state(ms).doorAngle;
    const openedAt = traversal === "enter" ? 3520 : 3840;
    assert.equal(angle(2320), 6 / 90);
    assert.equal(angle(2440), angle(2320));
    assert.equal(angle(2560), angle(2320));
    assert.ok(angle(2800)! > angle(2560)!);
    assert.equal(angle(openedAt), 1);
    assert.equal(angle(config.duration), 1);
    for (let ms = 0; ms <= openedAt; ms += 40) {
      assert.deepEqual(state(ms).cameraPosition, state(0).cameraPosition);
      assert.deepEqual(state(ms).cameraTarget, state(0).cameraTarget);
    }
    assert.ok(state(openedAt + 200).cameraPosition[2] < state(openedAt).cameraPosition[2]);
  });
}
