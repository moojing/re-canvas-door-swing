import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { doorAnimationConfigs } from "../animationState.ts";
import {
  doorEntrancePresetMap,
  doorEntrancePresets,
  getDoorEntrancePreset,
  resolveDoorEntrancePresetSelection,
} from "../presets.ts";
import { resolveDoorSurfaceTextureUrls } from "../surfaceTextures.ts";

describe("core door entrance presets", () => {
  it("returns a complete playable preset by id", () => {
    const preset = getDoorEntrancePreset("single-lever-wood");

    assert.equal(preset.id, "single-lever-wood");
    assert.equal(preset.type, "single");
    assert.equal(preset.motion, "hinge-single");
    assert.equal(preset.handleProfileId, "lever-l");
    assert.ok(preset.handleModelUrl);
    assert.equal(preset.material, "wood-panel-aged");
    assert.equal(preset.animation, "direct-entry");
  });

  it("assigns every published preset to a registered animation", () => {
    const animationIds = new Set(doorAnimationConfigs.map(({ id }) => id));

    for (const preset of doorEntrancePresets) {
      assert.equal(
        animationIds.has(preset.animation),
        true,
        `${preset.id} uses unknown animation ${preset.animation}`
      );
    }
  });

  it("keeps source references out of the runtime registry", () => {
    for (const preset of doorEntrancePresets) {
      assert.equal("sourceRefs" in preset, false);
      assert.equal("thumbnailRefs" in preset, false);
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

  it("resolves random selection from presets matching the requested type", () => {
    const preset = resolveDoorEntrancePresetSelection(
      { random: true, type: "double" },
      () => 0
    );

    assert.equal(preset.id, "double-lever-wood");
    assert.equal(preset.type, "double");
  });

  it("does not allow a named preset with filter fields", () => {
    assert.throws(
      () =>
        resolveDoorEntrancePresetSelection({
          preset: "single-lever-wood",
          type: "single",
        }),
      /preset already defines type/
    );
  });

  it("does not expose legacy door aliases", () => {
    assert.equal("door-single" in doorEntrancePresetMap, false);

    assert.throws(
      () => getDoorEntrancePreset("door-single" as never),
      /Unknown door entrance preset/
    );
  });

  it("rejects unknown preset values instead of falling back", () => {
    assert.throws(
      () => getDoorEntrancePreset("missing" as never),
      /Unknown door entrance preset/
    );
  });
});
