import assert from "node:assert/strict";
import { test } from "node:test";
import { getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";
import { usesRectangularKnobPlate, usesSteelKnobLook, getHandleTurnMultiplier } from "../renderLook.ts";
import { getSoundPlaybackRate } from "../soundWindow.ts";
import { compactWindowTextureV, usesCompactWindowLayout } from "../renderLook.ts";

test("running camera accelerates monotonically without speed resets at former joins", () => {
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset("biohazard-1996-a02-red-cross-running-door"));
  let previousStep = 0;
  for (let ms = 20; ms <= config.duration; ms += 20) {
    const distance = config.getState((ms - 20) / config.duration).cameraPosition[2] - config.getState(ms / config.duration).cameraPosition[2];
    assert.ok(distance >= previousStep - 1e-10, `deceleration at ${ms}ms`);
    previousStep = distance;
  }
  const z = (progress: number) => config.getState(progress).cameraPosition[2];
  const distance = z(0) - z(1);
  const oldFinalStep = distance * (1 - 0.98 ** 2);
  assert.ok(z(0.98) - z(1) > oldFinalStep * 1.48);
  assert.ok(z(0) - z(0.1) < distance * 0.002);
});

test("compact iron window stays above the mid-height handle on both faces", () => {
  assert.equal(usesCompactWindowLayout("biohazard-1999-a02-iron-window-door"), true);
  assert.equal(usesCompactWindowLayout("biohazard-1999-a02-iron-window-door-leave"), true);
  assert.equal(usesCompactWindowLayout("biohazard-1998-a03-grid-knob-door"), false);
  assert.equal(compactWindowTextureV(1), 1);
  assert.equal(compactWindowTextureV(0), 0);
  assert.ok(Math.abs(compactWindowTextureV(0.55) - 0.35) < 1e-10);
  // Authored glass ends at58% from top, now40.15%: above handle at50.3%.
  assert.ok(Math.abs(compactWindowTextureV(1 - 0.58 * 0.45 / 0.65) - 0.42) < 1e-10);
});

test("S9 starts open and accelerates through the leaf without an invented knob turn", () => {
  const preset = getDoorEntrancePreset("biohazard-1996-a02-red-cross-running-door");
  const config = getDoorEntranceAnimationConfig(preset);
  const at = (ms: number) => config.getState(ms / config.duration);
  assert.equal(config.duration, 4640);
  assert.equal(preset.hingeSide, "right");
  assert.equal(preset.swingDirection, "toward-viewer");
  assert.equal(preset.handleProfileId, "lever-l");
  assert.equal(preset.handleModelUrl, undefined);
  assert.equal(at(0).doorAngle, 78 / 90);
  assert.equal(at(0).cameraPosition[0], 3);
  assert.equal(at(0).cameraTarget[0], 3);
  for (let ms = 0; ms <= config.duration; ms += 160) {
    assert.equal(at(ms).doorAngle, at(0).doorAngle);
    assert.equal(at(ms).handleAngle, 0);
  }
  assert.ok(at(1600).cameraPosition[2] - at(2000).cameraPosition[2] < at(4000).cameraPosition[2] - at(4400).cameraPosition[2]);
  // Cubic acceleration reserves more travel for the faster final passage.
  assert.ok(at(4400).cameraPosition[2] < 2.8);
  assert.ok(Math.abs(at(4640).cameraPosition[2] - 0.45) < 1e-10);
  assert.equal(at(4400).fadeOut, 0);
  assert.equal(at(4640).fadeOut, 1);
  assert.equal(config.soundStartProgress, config.soundEndProgress);
  assert.equal(getSoundPlaybackRate(5000, config.duration, config), null);
  assert.equal(usesRectangularKnobPlate(preset.id), true);
  assert.equal(usesSteelKnobLook(preset.id), false);
});

test("iron window traversals approach, wait, turn silver round knobs and swing from opposite hinges", () => {
  const enter = getDoorEntrancePreset("biohazard-1999-a02-iron-window-door");
  const leave = getDoorEntrancePreset("biohazard-1999-a02-iron-window-door-leave");
  assert.equal(leave.variantOf, enter.id);
  assert.equal(enter.hingeSide, "right");
  assert.equal(leave.hingeSide, "left");
  assert.equal(enter.swingDirection, "away-from-viewer");
  assert.equal(leave.swingDirection, "toward-viewer");
  assert.equal(enter.handleTurnDirection, "counterclockwise");
  assert.equal(leave.handleTurnDirection, "clockwise");
  assert.equal(getHandleTurnMultiplier(enter.handleTurnDirection!, "front"), 1);
  assert.equal(getHandleTurnMultiplier(leave.handleTurnDirection!, "front"), -1);
  assert.equal(getHandleTurnMultiplier(enter.handleTurnDirection!, "back"), -1);
  assert.equal(getHandleTurnMultiplier(leave.handleTurnDirection!, "back"), 1);
  for (const preset of [enter, leave]) {
    assert.equal(usesSteelKnobLook(preset.id), true);
    assert.equal(usesRectangularKnobPlate(preset.id), false);
    assert.equal(preset.textureFlipY, true);
    assert.match(preset.frontTextureUrl!, /iron-window-door.jpg$/);
    const config = getDoorEntranceAnimationConfig(preset);
    const at = (ms: number) => config.getState(ms / config.duration);
    assert.ok(at(0).cameraPosition[2] > at(1440).cameraPosition[2]);
    assert.ok(at(1440).cameraPosition[2] > at(1920).cameraPosition[2]);
    const reverse = preset.traversal === "leave";
    const opening = reverse ? 2560 : 3040;
    const micro = reverse ? 2720 : 3200;
    const resume = reverse ? 3040 : 3520;
    assert.equal(config.duration, reverse ? 5280 : 4800);
    assert.deepEqual(at(1920).cameraPosition, at(opening).cameraPosition);
    assert.equal(at(opening).doorAngle, 0);
    assert.ok(Math.abs(at(opening).handleAngle! - Math.PI) < 1e-10);
    assert.ok(Math.abs(at(opening - 160).handleAngle! - Math.PI / 2) < 1e-10);
    assert.equal(at(micro).doorAngle, 6 / 90);
    assert.equal(at(micro).doorAngle, at(resume).doorAngle);
    assert.deepEqual(at(micro).cameraPosition, at(resume).cameraPosition);
    assert.ok(Math.abs(at(micro).handleAngle! - at(resume).handleAngle!) < 1e-10);
    assert.ok(at(resume + 80).doorAngle > 6 / 90);
    assert.equal(at(reverse ? 4160 : 4400).doorAngle, 1);
    assert.equal(at(reverse ? 4800 : 4560).fadeOut, 0);
    assert.equal(at(config.duration).fadeOut, 1);
  }
});
