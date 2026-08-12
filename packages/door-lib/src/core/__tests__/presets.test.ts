import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { doorEntrancePresetMap, getDoorEntrancePreset } from "../presets.ts";

describe("core presets", () => {
  it("maps the legacy single door preset to the default variant", () => {
    const preset = getDoorEntrancePreset("door-single");

    assert.equal(preset.id, "single-lever-wood");
    assert.equal(preset.variant, "direct-entry");
  });

  it("exposes legacy preset aliases from the compatibility map", () => {
    assert.equal(doorEntrancePresetMap["door-double"].id, "double-lever-wood");
  });

  it("rejects unknown legacy preset values instead of falling back", () => {
    assert.throws(
      () => getDoorEntrancePreset("missing" as never),
      /Unknown door entrance preset/
    );
  });
});
