import assert from "node:assert/strict";
import { test } from "node:test";
import { doorEntrancePresets, getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";

const id = "biohazard-1998-a03-grid-knob-door" as const;
test("selected 1998 grid door replaces the yellow representative in the released catalog", () => {
  const preset = getDoorEntrancePreset(id);
  assert.equal(preset.animationStyle, "biohazard-1998");
  assert.equal(preset.handleProfileId, "knob-round");
  assert.equal(preset.hingeSide, "left");
  assert.equal(preset.swingDirection, "toward-viewer");
  assert.match(preset.frontTextureUrl!, /1998-a03-grid-knob-door-front.webp$/);
  assert.ok(doorEntrancePresets.some(p => p.id === id));
  assert.ok(!doorEntrancePresets.some(p => p.id.includes("yellow-panel")));
  assert.equal(getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door").animationStyle, "biohazard-1996");
});
test("grid door waits in fixed framing, micro-opens, then passes with synchronized sound", () => {
  const preset = getDoorEntrancePreset(id);
  const config = getDoorEntranceAnimationConfig(preset);
  const state = (ms: number) => config.getState(ms / config.duration);
  assert.equal(config.duration, 4800);
  assert.deepEqual(state(0).cameraPosition, state(2800).cameraPosition);
  assert.equal(state(1900).doorAngle, 0);
  assert.ok(state(2350).doorAngle > 0);
  assert.equal(state(2350).doorAngle, state(2850).doorAngle);
  assert.ok(state(4250).doorAngle > 0.9);
  assert.equal(state(4550).fadeOut, 0);
  assert.equal(state(4800).fadeOut, 1);
  assert.equal(config.soundStartProgress, 2050 / 4800);
  assert.equal(config.soundEndProgress, 4550 / 4800);
  const leave = getDoorEntrancePreset("biohazard-1998-a03-grid-knob-door-leave");
  assert.equal(leave.variantOf, preset.id);
  assert.equal(leave.hingeSide, "right");
  assert.equal(leave.frontTextureUrl, preset.backTextureUrl);
});
