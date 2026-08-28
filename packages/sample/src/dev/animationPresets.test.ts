import assert from "node:assert/strict";
import test from "node:test";
import {
  isKnownAnimation,
  presetsForAnimation,
  resolveVerifierPreset,
} from "./animationPresets.ts";

const animations = ["direct-entry", "single-top-down-entry", "double-swing"];
const presets = [
  { id: "biohazard-1996-a01-iron-door", animation: "direct-entry" },
  { id: "biohazard-1998-a01-no-handle-door", animation: "direct-entry" },
];

test("recognizes registered animation ids only", () => {
  assert.equal(isKnownAnimation("direct-entry", animations), true);
  assert.equal(isKnownAnimation("unknown-entry", animations), false);
});

test("groups published presets by animation", () => {
  assert.deepEqual(presetsForAnimation("direct-entry", presets), [
    presets[0],
    presets[1],
  ]);
  assert.deepEqual(presetsForAnimation("double-swing", presets), []);
});

test("keeps every published preset when grouping by known animations", () => {
  const grouped = animations.flatMap((id) => presetsForAnimation(id, presets));
  assert.deepEqual(
    grouped.map((preset) => preset.id).sort(),
    presets.map((preset) => preset.id).sort()
  );
});

test("falls back to the first preset for a missing or mismatched id", () => {
  assert.equal(
    resolveVerifierPreset("direct-entry", presets),
    presets[0]
  );
  assert.equal(
    resolveVerifierPreset("direct-entry", presets, "not-a-preset"),
    presets[0]
  );
  assert.equal(
    resolveVerifierPreset("direct-entry", presets, "missing-phase-one-preset"),
    presets[0]
  );
});

test("returns null when an animation has no published presets", () => {
  assert.equal(resolveVerifierPreset("direct-entry", []), null);
  assert.deepEqual(presetsForAnimation("direct-entry", []), []);
});
