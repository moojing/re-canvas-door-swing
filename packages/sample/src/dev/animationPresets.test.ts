import assert from "node:assert/strict";
import test from "node:test";
import {
  isKnownAnimation,
  presetsForAnimation,
  resolveVerifierPreset,
  shouldCollapseAnimationLinks,
} from "./animationPresets.ts";

test("uses a header dropdown once animation links overflow", () => {
  assert.equal(shouldCollapseAnimationLinks(2), false);
  assert.equal(shouldCollapseAnimationLinks(3), true);
});

const animations = ["direct-entry", "single-top-down-entry", "double-swing"];
const presets = [
  { id: "single-lever-wood", animation: "direct-entry" },
  { id: "single-overhead-lever-wood", animation: "single-top-down-entry" },
  { id: "double-lever-wood", animation: "double-swing" },
];

test("recognizes registered animation ids only", () => {
  assert.equal(isKnownAnimation("direct-entry", animations), true);
  assert.equal(isKnownAnimation("unknown-entry", animations), false);
});

test("groups published presets by animation", () => {
  assert.deepEqual(presetsForAnimation("direct-entry", presets), [
    presets[0],
  ]);
  assert.deepEqual(presetsForAnimation("double-swing", presets), [
    presets[2],
  ]);
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
    resolveVerifierPreset("direct-entry", presets, "double-lever-wood"),
    presets[0]
  );
});

test("returns null when an animation has no published presets", () => {
  assert.equal(resolveVerifierPreset("direct-entry", []), null);
  assert.deepEqual(presetsForAnimation("direct-entry", []), []);
});
