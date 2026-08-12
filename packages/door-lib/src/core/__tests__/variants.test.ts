import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  doorEntranceVariants,
  getDoorEntranceVariant,
  resolveDoorEntranceVariantSelection,
} from "../variants.ts";

describe("core door entrance variants", () => {
  it("returns a complete playable variant by id", () => {
    const variant = getDoorEntranceVariant("single-lever-wood");

    assert.equal(variant.id, "single-lever-wood");
    assert.equal(variant.type, "single");
    assert.equal(variant.motion, "hinge-single");
    assert.equal(variant.handleProfileId, "lever-l");
    assert.equal(variant.material, "wood-panel-aged");
    assert.equal(variant.animation, "direct-entry");
  });

  it("keeps source references out of the runtime registry", () => {
    for (const variant of doorEntranceVariants) {
      assert.equal("sourceRefs" in variant, false);
      assert.equal("thumbnailRefs" in variant, false);
    }
  });

  it("resolves random selection from variants matching the requested type", () => {
    const variant = resolveDoorEntranceVariantSelection(
      { random: true, type: "double" },
      () => 0
    );

    assert.equal(variant.id, "double-lever-wood");
    assert.equal(variant.type, "double");
  });

  it("does not allow variant with filter fields", () => {
    assert.throws(
      () =>
        resolveDoorEntranceVariantSelection({
          variant: "single-lever-wood",
          type: "single",
        }),
      /variant already defines type/
    );
  });
});
