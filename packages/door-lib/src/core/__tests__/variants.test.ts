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
    const preset = getDoorEntrancePreset();

    assert.equal(preset.id, "biohazard-1996-a01-iron-door");
    assert.equal(preset.label, "1-1 A-1 Iron Door");
    assert.equal(preset.type, "single");
    assert.equal(preset.motion, "hinge-single");
    assert.equal(preset.handleProfileId, undefined);
    assert.equal(preset.handleModelUrl, undefined);
    assert.equal(preset.material, "rusted-iron-riveted-panel");
    assert.equal(preset.animation, "direct-entry");
  });

  it("publishes the Phase 1 Biohazard A-1 iron door as a handle-free preset", () => {
    const preset = getDoorEntrancePreset("biohazard-1996-a01-iron-door");

    assert.equal(preset.id, "biohazard-1996-a01-iron-door");
    assert.equal(preset.label, "1-1 A-1 Iron Door");
    assert.equal(preset.type, "single");
    assert.equal(preset.motion, "hinge-single");
    assert.equal(preset.handleProfileId, undefined);
    assert.equal(preset.handleModelUrl, undefined);
    assert.equal(preset.material, "rusted-iron-riveted-panel");
    assert.equal(preset.animation, "direct-entry");
    assert.equal(preset.hingeSide, "left");
    assert.equal(preset.mirrorTextureX, false);
    assert.match(
      preset.frontTextureUrl ?? "",
      /biohazard-1996-a01-iron-door-front\.webp$/
    );
    assert.match(
      preset.backTextureUrl ?? "",
      /biohazard-1996-a01-iron-door-back\.webp$/
    );
  });

  it("publishes the Phase 1 Biohazard A-1 mirror as the opposite no-handle preset", () => {
    const source = getDoorEntrancePreset("biohazard-1996-a01-iron-door");
    const preset = getDoorEntrancePreset("biohazard-1998-a01-no-handle-door");

    assert.equal(preset.id, "biohazard-1998-a01-no-handle-door");
    assert.equal(preset.label, "1-2 A-1 No-Handle Door");
    assert.equal(preset.type, "single");
    assert.equal(preset.motion, "hinge-single");
    assert.equal(preset.handleProfileId, undefined);
    assert.equal(preset.handleModelUrl, undefined);
    assert.equal(preset.material, "rusted-iron-riveted-panel");
    assert.equal(preset.animation, "direct-entry");
    assert.equal(preset.hingeSide, "right");
    assert.equal(preset.mirrorTextureX, true);
    assert.equal(preset.frontTextureUrl, source.frontTextureUrl);
    assert.equal(preset.edgeTextureUrl, source.edgeTextureUrl);
    assert.equal(preset.backTextureUrl, source.backTextureUrl);
  });

  it("publishes the Phase 1 Biohazard A-2 yellow panel door as a round-knob preset", () => {
    const preset = getDoorEntrancePreset(
      "biohazard-1996-a02-yellow-panel-knob-door" as never
    );

    assert.equal(preset.id, "biohazard-1996-a02-yellow-panel-knob-door");
    assert.equal(preset.label, "1-1 A-2 Yellow Panel Knob Door");
    assert.equal(preset.type, "single");
    assert.equal(preset.motion, "hinge-single");
    assert.equal(preset.handleProfileId, "knob-round");
    assert.match(preset.handleModelUrl ?? "", /door_knob\.glb$/);
    assert.equal(preset.material, "aged-wood-panel");
    assert.equal(preset.animation, "direct-entry");
    assert.equal(preset.hingeSide, "left");
    assert.equal(preset.mirrorTextureX, false);
    assert.match(
      preset.frontTextureUrl ?? "",
      /biohazard-1996-a02-yellow-panel-knob-door-front\.webp$/
    );
    assert.match(
      preset.backTextureUrl ?? "",
      /biohazard-1996-a02-yellow-panel-knob-door-back\.webp$/
    );
  });

  it("keeps Phase 1 runtime presets fully authored", () => {
    assert.deepEqual(
      doorEntrancePresets.map((preset) => preset.id),
      [
        "biohazard-1996-a01-iron-door",
        "biohazard-1998-a01-no-handle-door",
        "biohazard-1996-a02-yellow-panel-knob-door",
      ]
    );

    for (const preset of doorEntrancePresets) {
      assert.ok(preset.frontTextureUrl, `${preset.id} needs a front texture`);
      assert.ok(preset.backTextureUrl, `${preset.id} needs a back texture`);
      assert.ok(preset.edgeTextureUrl, `${preset.id} needs an edge texture`);
      assert.ok(preset.type, `${preset.id} needs a type`);
      assert.ok(preset.motion, `${preset.id} needs a motion`);
      assert.ok(preset.material, `${preset.id} needs a material`);
      assert.ok(preset.animation, `${preset.id} needs an animation`);
      assert.ok(preset.hingeSide, `${preset.id} needs a hinge side`);
      assert.equal(
        typeof preset.mirrorTextureX,
        "boolean",
        `${preset.id} needs an explicit texture mirror setting`
      );
    }
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

  it("resolves random selection from presets matching the requested filters", () => {
    const preset = resolveDoorEntrancePresetSelection(
      {
        random: true,
        type: "single",
        motion: "hinge-single",
        material: "rusted-iron-riveted-panel",
      },
      () => 0
    );

    assert.equal(preset.id, "biohazard-1996-a01-iron-door");
    assert.equal(preset.type, "single");
  });

  it("resolves random selection from round-knob presets", () => {
    const preset = resolveDoorEntrancePresetSelection(
      { random: true, handle: "knob-round" },
      () => 0
    );

    assert.equal(preset.id, "biohazard-1996-a02-yellow-panel-knob-door");
    assert.equal(preset.handleProfileId, "knob-round");
  });

  it("does not allow a named preset with filter fields", () => {
    assert.throws(
      () =>
        resolveDoorEntrancePresetSelection({
          preset: "biohazard-1996-a01-iron-door",
          type: "single",
        }),
      /preset already defines type/
    );
  });

  it("does not expose legacy door aliases or retired demo presets", () => {
    assert.equal("door-single" in doorEntrancePresetMap, false);
    assert.equal("single-lever-wood" in doorEntrancePresetMap, false);
    assert.equal("single-overhead-lever-wood" in doorEntrancePresetMap, false);
    assert.equal("double-lever-wood" in doorEntrancePresetMap, false);

    assert.throws(
      () => getDoorEntrancePreset("door-single" as never),
      /Unknown door entrance preset/
    );
    assert.throws(
      () => getDoorEntrancePreset("single-lever-wood" as never),
      /Unknown door entrance preset/
    );
    assert.throws(
      () => getDoorEntrancePreset("single-overhead-lever-wood" as never),
      /Unknown door entrance preset/
    );
    assert.throws(
      () => getDoorEntrancePreset("double-lever-wood" as never),
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
