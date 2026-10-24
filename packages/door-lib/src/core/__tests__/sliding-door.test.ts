import assert from "node:assert/strict";
import { test } from "node:test";
import { getDoorEntrancePreset, resolveDoorEntrancePresetSelection } from "../presets.ts";
import { getSoundVolume } from "../soundWindow.ts";
import { getDoorAnimationConfig } from "../animationState.ts";
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
  assert.equal(config.duration, 5650);
  assert.deepEqual(state(3300).leftDoorOffset, [0, 0, 0]);
  assert.deepEqual(state(1900).cameraPosition, state(3300).cameraPosition);
  for (let ms = 0; ms <= config.duration; ms += 50) {
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
  assert.equal(config.soundStartProgress, 3350 / 5650);
  assert.equal(config.soundEndProgress, 1);
});
test("preview timing edits retime translation and sound together without changing the preset", () => {
  const preset = getDoorEntrancePreset(id);
  const authored = getDoorEntranceAnimationConfig(preset);
  const edited = getDoorEntranceAnimationConfig(preset, { "opening-start": 3000 });
  assert.deepEqual(authored.getState(3200 / 5650).leftDoorOffset, [0, 0, 0]);
  assert.ok(edited.getState(3200 / 5650).leftDoorOffset![0] < 0);
  assert.equal(edited.soundStartProgress, 3000 / 5650);
  assert.equal(getDoorEntranceAnimationConfig(preset).soundStartProgress, authored.soundStartProgress);
});

test("sliding traversals use the Kyodon automatic-door sound and its opening crop", () => {
  for (const suffix of ["", "-leave"] as const) {
    const preset = getDoorEntrancePreset(`${id}${suffix}`);
    assert.match(preset.soundUrl ?? "", /freesound_kyodon-automatic-door-153423-hq\.mp3$/);
    const config = getDoorEntranceAnimationConfig(preset);
    assert.equal(config.soundSourceStartProgress, 1.64 / 3.940227);
    assert.equal(config.soundSourceEndProgress, 1);
  }
});

test("sliding keeps a black hold before fading the sound tail", () => {
  for (const suffix of ["", "-leave"] as const) {
    const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(`${id}${suffix}`));
    for (const ms of [5000, 5100, 5250, 5450, 5650]) {
      assert.equal(config.getState(ms / config.duration).fadeOut, 1);
    }
    assert.equal(getSoundVolume(5100 / config.duration, config), 1);
    assert.ok(Math.abs(getSoundVolume(5450 / config.duration, config) - 0.5) < 1e-9);
    assert.equal(getSoundVolume(1, config), 0);
    assert.equal(config.soundFadeOutStartProgress, 5250 / config.duration);
  }
  const fallback = getDoorAnimationConfig("center-split-slide");
  assert.equal(getSoundVolume(1, fallback), 0);
});


test("preview edits retime sound fade and picture black independently", () => {
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id), {
    "fade-end": 4900,
    "sound-fade-start": 5350,
  });
  assert.equal(config.getState(4900 / config.duration).fadeOut, 1);
  assert.equal(config.soundFadeOutStartProgress, 5350 / config.duration);
  assert.equal(getSoundVolume(5300 / config.duration, config), 1);
  assert.ok(Math.abs(getSoundVolume(5500 / config.duration, config) - 0.5) < 1e-9);
  assert.equal(getDoorEntranceAnimationConfig(getDoorEntrancePreset(id)).soundFadeOutStartProgress, 5250 / config.duration);
});

test("closed sliding approach reaches a larger lower-cropped hold", () => {
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
  const state = config.getState(3300 / config.duration);
  const fullHeightFraction = 6 / (2 * (state.cameraPosition[2] - 0.162) * Math.tan(Math.PI / 6));
  assert.ok(fullHeightFraction > 1 && fullHeightFraction < 1.04);
  assert.equal(state.cameraPosition[1], state.cameraTarget[1]);
  assert.ok(state.cameraPosition[1] > 0.8, "level elevated view preserves the upper margin");
});
