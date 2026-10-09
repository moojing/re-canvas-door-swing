import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDoorAnimationConfig } from "../animationState.ts";
import { doorEntrancePresets, getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";

const stateAt = (presetId: Parameters<typeof getDoorEntrancePreset>[0], eventId: string) => {
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(presetId));
  const event = config.timelineEvents?.find(({ id }) => id === eventId);
  assert.ok(event, `missing ${eventId}`);
  return config.getState(event.atMs / config.duration);
};

describe("released preset animation styles", () => {
  it("assigns every released door to an explicit 1996, 1998, or 1999 style", () => {
    assert.equal(getDoorEntrancePreset("biohazard-1996-a01-iron-door").animationStyle, "biohazard-1996");
    assert.equal(getDoorEntrancePreset("biohazard-1996-a01-iron-door-leave").animationStyle, "biohazard-1996");
    assert.equal(getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door").animationStyle, "biohazard-1996");
    assert.equal(getDoorEntrancePreset("biohazard-1996-b02-blue-panel-double-door").animationStyle, "biohazard-1996");
    assert.equal(getDoorEntrancePreset("biohazard-1998-a01-no-handle-door").animationStyle, "biohazard-1998");
    assert.equal(getDoorEntrancePreset("biohazard-1999-a01-parking-door").animationStyle, "biohazard-1999");
  });

  it("holds a visibly open leaf in the 1996 and 1998 profiles", () => {
    for (const id of ["biohazard-1996-a01-iron-door", "biohazard-1996-a02-yellow-panel-knob-door", "biohazard-1996-b02-blue-panel-double-door", "biohazard-1998-a01-no-handle-door"] as const) {
      const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
      const start = config.timelineEvents!.find(({ id: eventId }) => eventId === "slight-open")!;
      const end = config.timelineEvents!.find(({ id: eventId }) => eventId === "hold-end")!;
      const middle = config.getState((start.atMs + end.atMs) / 2 / config.duration);
      assert.ok(middle.doorAngle > 0 && middle.doorAngle < 0.3, id);
      assert.equal(middle.doorAngle, config.getState(end.atMs / config.duration).doorAngle, id);
    }
  });

  it("pauses once at micro-open then advances without a late slowdown", () => {
    for (const preset of doorEntrancePresets.filter(({ animationSet }) =>
      animationSet === "1996-single-micro-open-advance")) {
      const config = getDoorEntranceAnimationConfig(preset);
      const atMs = (ms: number) => config.getState(ms / config.duration);
      assert.equal(atMs(3300).doorAngle, atMs(3700).doorAngle);
      assert.deepEqual(atMs(3300).cameraPosition, atMs(3700).cameraPosition);
      let previousDoorStep = 0;
      let previousCameraStep = 0;
      for (let ms = 3700; ms < config.duration; ms += 100) {
        const start = atMs(ms);
        const end = atMs(ms + 100);
        const doorStep = end.doorAngle - start.doorAngle;
        const cameraStep = start.cameraPosition[2] - end.cameraPosition[2];
        assert.ok(doorStep > 0, `${preset.id}: leaf stopped at ${ms}`);
        assert.ok(cameraStep > 0, `${preset.id}: camera stopped at ${ms}`);
        assert.ok(doorStep + 1e-10 >= previousDoorStep, `${preset.id}: leaf slowed at ${ms}`);
        assert.ok(cameraStep + 1e-10 >= previousCameraStep, `${preset.id}: camera slowed at ${ms}`);
        previousDoorStep = doorStep;
        previousCameraStep = cameraStep;
      }
    }
  });

  it("fades the iron door with a broad face still visible rather than swinging fully open", () => {
    const id = "biohazard-1996-a01-iron-door";
    const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
    assert.ok(Math.abs(stateAt(id, "slight-open").doorAngle * 90 - 10) < 0.01);
    const fading = stateAt(id, "fade-start");
    assert.ok(fading.doorAngle * 90 >= 26 && fading.doorAngle * 90 <= 30);
    assert.ok(Math.abs(config.getState(1).doorAngle * 90 - 30) < 0.01);
    assert.ok(fading.cameraPosition[2] > 4, "camera must not race through the door");
    assert.equal(config.getState(1).fadeOut, 1);
  });

  it("uses identical motion and camera settings for members of the 1996 micro-open single-door set", () => {
    const presets = doorEntrancePresets.filter((preset) =>
      preset.animationSet === "1996-single-micro-open-advance");
    assert.equal(presets.length, 2);
    const baseline = getDoorEntranceAnimationConfig(presets[0]);
    for (const preset of presets) {
      const config = getDoorEntranceAnimationConfig(preset);
      assert.equal(config.duration, baseline.duration, preset.id);
      assert.equal(config.soundStartProgress, baseline.soundStartProgress, preset.id);
      assert.equal(config.soundEndProgress, baseline.soundEndProgress, preset.id);
      assert.deepEqual(config.timelineEvents?.filter(({ id }) => id !== "handle-start"),
        baseline.timelineEvents?.filter(({ id }) => id !== "handle-start"), preset.id);
      for (let ms = 0; ms <= baseline.duration; ms += 40) {
        const actual = config.getState(ms / config.duration);
        const expected = baseline.getState(ms / baseline.duration);
        assert.equal(actual.doorAngle, expected.doorAngle, preset.id);
        assert.deepEqual(actual.cameraPosition, expected.cameraPosition, preset.id);
        assert.deepEqual(actual.cameraTarget, expected.cameraTarget, preset.id);
        assert.equal(actual.fadeOut, expected.fadeOut, preset.id);
      }
    }
    // Selection follows motion and explicit style even when the ID changes.
    const renamed = getDoorEntranceAnimationConfig({ ...presets[1], id: presets[0].id });
    assert.equal(renamed.duration, baseline.duration);
    assert.deepEqual(renamed.getState(0.75), getDoorEntranceAnimationConfig(presets[1]).getState(0.75));
  });

  it("preserves variant geometry while sharing the optional knob action", () => {
    for (const baseId of ["biohazard-1996-a01-iron-door", "biohazard-1996-a02-yellow-panel-knob-door"] as const) {
      const enter = getDoorEntrancePreset(baseId);
      const leave = doorEntrancePresets.find((preset) => preset.variantOf === baseId)!;
      assert.equal(enter.traversal, "enter");
      assert.equal(leave.traversal, "leave");
      assert.equal(leave.hingeSide, "right");
      assert.equal(leave.frontTextureUrl, enter.backTextureUrl);
      assert.equal(leave.backTextureUrl, enter.frontTextureUrl);
      assert.notEqual(leave.swingDirection, enter.swingDirection);
      const config = getDoorEntranceAnimationConfig(leave);
      const state = config.getState(2850 / config.duration);
      assert.equal(state.doorAngle, 0);
      if (leave.handleProfileId) {
        assert.ok(state.handleAngle! > 0);
        assert.deepEqual(config.getState(0.7), getDoorEntranceAnimationConfig(enter).getState(0.7));
      } else {
        assert.equal(state.handleAngle, 0);
        assert.equal(config.timelineEvents?.some(({ id }) => id === "handle-start"), false);
      }
    }
  });

  it("keeps 1999 parking closed during its wait and opens continuously afterward", () => {
    const preset = getDoorEntrancePreset("biohazard-1999-a01-parking-door");
    const config = getDoorEntranceAnimationConfig(preset);
    assert.equal(stateAt(preset.id, "closed-hold-end").doorAngle, 0);
    assert.equal(config.timelineEvents?.some(({ id }) => id === "hold-end"), false);
    const opened = stateAt(preset.id, "open-end").doorAngle;
    assert.ok(opened > 0.9);
    const halfway = config.getState((config.timelineEvents!.find(({ id }) => id === "closed-hold-end")!.atMs + config.timelineEvents!.find(({ id }) => id === "open-end")!.atMs) / 2 / config.duration);
    assert.ok(halfway.doorAngle > 0 && halfway.doorAngle < opened);
  });

  it("keeps double leaves and knob action on their own tracks", () => {
    const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset("biohazard-1996-b02-blue-panel-double-door"));
    const opening = stateAt("biohazard-1996-b02-blue-panel-double-door", "open-end");
    assert.ok(opening.doorAngle > 0.9);
    assert.ok((opening.rightDoorAngle ?? 0) > 0.9);
    assert.ok(config.getState(0.5).handleAngle !== undefined);
  });

  it("preserves legacy animation behavior for a preset without a style", () => {
    const styled = getDoorEntrancePreset("biohazard-1996-a01-iron-door");
    const legacy = getDoorEntranceAnimationConfig({ ...styled, animationStyle: undefined, animationSet: undefined });
    assert.equal(legacy, getDoorAnimationConfig(styled.animation));
  });

  it("provides labeled markers, sound crop, and a deterministic edited hold", () => {
    const preset = getDoorEntrancePreset("biohazard-1998-a01-no-handle-door");
    const normal = getDoorEntranceAnimationConfig(preset);
    const holdEnd = normal.timelineEvents!.find(({ id }) => id === "hold-end")!;
    const edited = getDoorEntranceAnimationConfig(preset, { "hold-end": holdEnd.atMs + 200 });
    assert.equal(edited.timelineEvents!.find(({ id }) => id === "hold-end")!.atMs, holdEnd.atMs + 200);
    assert.equal(edited.getState((holdEnd.atMs + 100) / edited.duration).doorAngle, normal.getState(holdEnd.atMs / normal.duration).doorAngle);
    assert.deepEqual(edited.progressMarkers, edited.timelineEvents!.map(({ atMs }) => atMs / edited.duration));
    assert.ok((edited.soundSourceStartProgress ?? 0) > 0);
    assert.ok((edited.soundEndProgress ?? 0) > (edited.soundStartProgress ?? 0));
    const openingStart = normal.timelineEvents!.find(({ id }) => id === "opening-start")!;
    assert.equal(normal.soundStartProgress, openingStart.atMs / normal.duration);
  });
});
