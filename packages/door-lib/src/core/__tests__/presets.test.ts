import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDoorEntrancePreset } from "../presets.ts";

describe("core presets", () => {
  it("maps the legacy single door preset to the default variant", () => {
    const preset = getDoorEntrancePreset("door-single");

    assert.equal(preset.id, "single-lever-wood");
    assert.equal(preset.variant, "direct-entry");
  });

  it("falls back to the default variant for unknown legacy values", () => {
    const preset = getDoorEntrancePreset("missing" as never);

    assert.equal(preset.id, "single-lever-wood");
  });
});
