import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDoorAnimationConfig } from "../animationState.ts";
import { getDoorEntrancePreset } from "../presets.ts";
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
    const legacy = getDoorEntranceAnimationConfig({ ...styled, animationStyle: undefined });
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
