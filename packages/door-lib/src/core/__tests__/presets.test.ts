import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDoorEntrancePreset } from "../presets.ts";

describe("core presets", () => {
  it("returns the single door preset by default", () => {
    const preset = getDoorEntrancePreset("door-single");

    assert.equal(preset.id, "door-single");
    assert.equal(preset.variant, "direct-entry");
  });

  it("falls back to the default preset for unknown values", () => {
    const preset = getDoorEntrancePreset("missing" as never);

    assert.equal(preset.id, "door-single");
  });
});
