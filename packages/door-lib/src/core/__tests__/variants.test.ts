import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  doorEntranceVariants,
  getDoorEntranceVariant,
  resolveDoorEntranceVariantSelection,
} from "../variants.ts";
import { resolveDoorSurfaceTextureUrls } from "../surfaceTextures.ts";

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

  it("resolves missing back and edge textures from the front texture", () => {
    const textures = resolveDoorSurfaceTextureUrls(
      {
        frontTextureUrl: "/textures/door-front.png",
        edgeTextureUrl: "/textures/door-edge.png",
      },
      "/textures/default-door.png"
    );

    assert.deepEqual(textures, {
      frontTextureUrl: "/textures/door-front.png",
      edgeTextureUrl: "/textures/door-edge.png",
      backTextureUrl: "/textures/door-front.png",
    });
  });

  it("keeps the legacy texture URL as the fallback for every door surface", () => {
    const textures = resolveDoorSurfaceTextureUrls(
      { textureUrl: "/textures/legacy-door.png" },
      "/textures/default-door.png"
    );

    assert.deepEqual(textures, {
      frontTextureUrl: "/textures/legacy-door.png",
      edgeTextureUrl: "/textures/legacy-door.png",
      backTextureUrl: "/textures/legacy-door.png",
    });
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

  it("maps deprecated preset selection without treating it as a variant", () => {
    const variant = resolveDoorEntranceVariantSelection({
      preset: "door-double",
    });

    assert.equal(variant.id, "double-lever-wood");
  });

  it("rejects legacy preset aliases passed through variant", () => {
    assert.throws(
      () =>
        resolveDoorEntranceVariantSelection({
          variant: "door-single" as never,
        }),
      /Unknown door entrance variant/
    );
  });

  it("rejects unknown variant values instead of falling back", () => {
    assert.throws(
      () => getDoorEntranceVariant("missing" as never),
      /Unknown door entrance variant/
    );
  });
});
