import assert from "node:assert/strict";
import { test } from "node:test";
import { getDoorEntrancePreset, resolveDoorEntrancePresetSelection } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";

const id = "biohazard-1996-b07-automatic-sliding-door" as const;
test("automatic sliding preset selects translation with no accessory", () => {
  const preset = getDoorEntrancePreset(id);
  assert.equal(preset.motion, "slide-double");
  assert.equal(preset.animation, "center-split-slide");
  assert.equal(preset.type, "double");
  assert.equal(preset.textureFlipY, true);
  assert.equal(preset.handleProfileId, undefined);
  assert.equal(preset.handleModelUrl, undefined);
  assert.equal(resolveDoorEntrancePresetSelection({ random: true, motion: "slide-double" }, () => 0).id, id);
  assert.equal(getDoorEntrancePreset(`${id}-leave`).variantOf, id);
});
test("automatic leaves wait, translate symmetrically and never rotate", () => {
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
  const state = (ms: number) => config.getState(ms / config.duration);
  assert.equal(config.duration, 5000);
  assert.deepEqual(state(3300).leftDoorOffset, [0, 0, 0]);
  assert.deepEqual(state(1600).cameraPosition, state(3300).cameraPosition);
  for (let ms = 0; ms <= 5000; ms += 50) {
    const s = state(ms);
    assert.equal(s.doorAngle, 0);
    assert.equal(s.rightDoorAngle, undefined);
    assert.equal(s.handleAngle, 0);
    assert.equal(s.leftDoorOffset![0] + s.rightDoorOffset![0], 0);
    assert.deepEqual(s.leftDoorOffset!.slice(1), [0, 0]);
  }
  assert.ok(state(3850).leftDoorOffset![0] < -0.5);
  assert.equal(state(4600).fadeOut, 0);
  assert.equal(state(5000).fadeOut, 1);
  assert.equal(config.soundStartProgress, 3350 / 5000);
  assert.equal(config.soundEndProgress, 4600 / 5000);
});
test("preview timing edits retime translation and sound together without changing the preset", () => {
  const preset = getDoorEntrancePreset(id);
  const authored = getDoorEntranceAnimationConfig(preset);
  const edited = getDoorEntranceAnimationConfig(preset, { "opening-start": 3000 });
  assert.deepEqual(authored.getState(0.64).leftDoorOffset, [0, 0, 0]);
  assert.ok(edited.getState(0.64).leftDoorOffset![0] < 0);
  assert.equal(edited.soundStartProgress, 0.6);
  assert.equal(getDoorEntranceAnimationConfig(preset).soundStartProgress, authored.soundStartProgress);
});
