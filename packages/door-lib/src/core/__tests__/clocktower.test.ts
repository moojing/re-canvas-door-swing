import assert from "node:assert/strict";
import { test } from "node:test";
import { getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";
import { getHandleTurnMultiplier } from "../renderLook.ts";

for (const leave of [false, true]) {
  test(`clocktower ${leave ? "Leave" : "Enter"}: quarter turn, stationary opposite leaf and staged passage`, () => {
    const preset = getDoorEntrancePreset(leave ? "biohazard-1999-b03-clocktower-door-leave" : "biohazard-1999-b03-clocktower-door");
    const config = getDoorEntranceAnimationConfig(preset);
    const at = (ms: number) => config.getState(ms / config.duration);
    const event = (id: string) => config.timelineEvents!.find(e => e.id === id)!.atMs;
    const opening = event("opening-start"), micro = event("slight-open"), hold = event("hold-end"), passage = event("passage");
    const turn = (ms: number) => leave ? at(ms).handleAngle! : at(ms).rightHandleAngle!;
    const leaf = (ms: number) => leave ? at(ms).doorAngle : at(ms).rightDoorAngle!;
    assert.equal(preset.swingDirection, leave ? "toward-viewer" : "away-from-viewer");
    assert.equal(preset.handleTurnDirection, leave ? "clockwise" : "counterclockwise");
    // Front indicator moves 12→3 clockwise or 3→12 counterclockwise.
    const initial = leave ? Math.PI / 2 : 0;
    const final = initial + turn(opening) * getHandleTurnMultiplier(preset.handleTurnDirection!, "front");
    assert.ok(Math.abs(final - (leave ? 0 : Math.PI / 2)) < 1e-9);
    assert.equal(leaf(opening), 0);
    assert.ok(leaf(micro) > 0 && leaf(micro) < 0.1);
    assert.equal(leaf(micro), leaf(hold));
    assert.equal(leaf(passage), 1);
    assert.ok(at(0).cameraPosition[2] > at(1600).cameraPosition[2]);
    assert.deepEqual(at(1600).cameraPosition, at(passage).cameraPosition);
    assert.ok(at(config.duration).cameraPosition[2] < at(passage).cameraPosition[2]);
    for (let ms = 0; ms <= config.duration; ms += 40) {
      assert.equal(leave ? at(ms).rightDoorAngle : at(ms).doorAngle, 0);
      assert.equal(leave ? at(ms).rightHandleAngle : at(ms).handleAngle, 0);
    }
    assert.equal(at(config.duration).fadeOut, 1);
  });
}
