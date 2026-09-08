import assert from "node:assert/strict";
import { test } from "node:test";
import { getDrawingBufferSize, usesAgedWoodLook } from "../renderLook.ts";

test("wood lighting and tint are limited to the yellow panel preset", () => {
  assert.equal(usesAgedWoodLook("biohazard-1996-a02-yellow-panel-knob-door"), true);
  assert.equal(usesAgedWoodLook("biohazard-1996-a01-iron-door"), false);
  assert.equal(usesAgedWoodLook("biohazard-1998-a01-no-handle-door"), false);
});

test("retro resolution preserves aspect ratio and ignores device pixel ratio", () => {
  assert.deepEqual(getDrawingBufferSize(800, 600, 2, true), [480, 360]);
  assert.deepEqual(getDrawingBufferSize(1200, 600, 1, true), [720, 360]);
  assert.deepEqual(getDrawingBufferSize(160, 120, 2, true), [160, 120]);
});

test("standard presets retain capped HiDPI and dimensions never become zero", () => {
  assert.deepEqual(getDrawingBufferSize(800, 600, 3, false), [1600, 1200]);
  assert.deepEqual(getDrawingBufferSize(0, 0, 1, true), [1, 1]);
});
