import assert from "node:assert/strict";
import { test } from "node:test";
import { getDoorEntrancePreset, doorEntrancePresets } from "../presets.ts";
import { getDoorEntranceAnimationConfig, getDoorEntranceCameraAuthoringInfo } from "../presetAnimation.ts";
import { projectedDoorHeight } from "../cameraAuthoring.ts";

const preset = getDoorEntrancePreset("biohazard-1999-a02-iron-window-door");
test("empty authoring keeps every released preset identical", () => {
  for (const p of doorEntrancePresets) {
    const base = getDoorEntranceAnimationConfig(p), draft = getDoorEntranceAnimationConfig(p, {}, {});
    for (const t of [0, .1, .35, .6, .9, 1]) assert.deepEqual(draft.getState(t), base.getState(t));
  }
});
test("projected framing fits full off-center door including values above100 percent", () => {
  const original = getDoorEntranceAnimationConfig(preset);
  for (const height of [50, 80, 120, 160]) {
    const draft = getDoorEntranceAnimationConfig(preset, {}, { initialHeightPercent: height });
    const state = draft.getState(0);
    assert.ok(Math.abs(projectedDoorHeight(state, 3) - height) < .01);
    assert.deepEqual(state.cameraTarget, original.getState(0).cameraTarget);
    assert.deepEqual(draft.getState(1), original.getState(1));
  }
  const info = getDoorEntranceCameraAuthoringInfo(preset);
  const draft = getDoorEntranceAnimationConfig(preset, {}, { approachHeightPercent: 130 });
  assert.ok(Math.abs(projectedDoorHeight(draft.getState(info.approachAtMs! / draft.duration), 3) - 130) < .01);
});
test("camera edits preserve every non-camera field and sound timing without mutating source", () => {
  const original = getDoorEntranceAnimationConfig(preset);
  const before = structuredClone(original.getState(.4));
  const draft = getDoorEntranceAnimationConfig(preset, {}, { initialHeightPercent: 80, cameraHoldMs: 400, cameraPace: 1.3 });
  assert.equal(draft.duration, original.duration);
  assert.equal(draft.soundStartProgress, original.soundStartProgress);
  for (const t of [0, .1, .4, .8, 1]) {
    const { cameraPosition: _p, cameraTarget: _t, ...rest } = draft.getState(t);
    const { cameraPosition: _op, cameraTarget: _ot, ...expected } = original.getState(t);
    assert.deepEqual(rest, expected);
  }
  assert.deepEqual(getDoorEntranceAnimationConfig(preset).getState(.4), before);
  assert.deepEqual(draft.getState(0).cameraPosition, draft.getState(300 / draft.duration).cameraPosition);
});
test("shared opening wait shifts all later events and audio tail and extends duration", () => {
  const p = getDoorEntrancePreset("biohazard-1996-b07-automatic-sliding-door");
  const base = getDoorEntranceAnimationConfig(p), draft = getDoorEntranceAnimationConfig(p, {}, { openingWaitMs: 700 });
  assert.equal(draft.duration, base.duration + 700);
  for (const event of base.timelineEvents!) {
    const expected = event.atMs > 1900 ? event.atMs + 700 : event.atMs;
    assert.equal(draft.timelineEvents!.find(e => e.id === event.id)!.atMs, expected);
  }
  for (const key of ["soundStartProgress", "soundEndProgress", "soundFadeOutStartProgress"] as const) {
    assert.ok(Math.abs(draft[key]! * draft.duration - (base[key]! * base.duration + 700)) < .001);
  }
  for (const ms of [3350, 4000, 4700, 5250, 5650]) {
    assert.deepEqual(draft.getState((ms + 700) / draft.duration), base.getState(ms / base.duration));
  }
});
test("invalid or unsupported drafts fail before a preview can adopt them", () => {
  for (const draft of [{ cameraPace: NaN }, { cameraPace: 0 }, { initialHeightPercent: Infinity },
    { initialHeightPercent: -10 }, { cameraHoldMs: -1 }, { cameraHoldMs: 99999 }, { openingWaitMs: -1 }]) {
    assert.throws(() => getDoorEntranceAnimationConfig(preset, {}, draft));
  }
  const running = getDoorEntrancePreset("biohazard-1996-a02-red-cross-running-door");
  assert.equal(getDoorEntranceCameraAuthoringInfo(running).supportsOpeningWait, false);
  assert.throws(() => getDoorEntranceAnimationConfig(running, {}, { openingWaitMs: 500 }), /closed|wait/i);
  assert.throws(() => getDoorEntranceAnimationConfig(running, {}, { initialHeightPercent: 80 }), /closed|framing/i);
});

test("combined phase and camera edits stay independent across every closed preset", () => {
  for (const p of doorEntrancePresets) {
    const info = getDoorEntranceCameraAuthoringInfo(p);
    if (!info.supportsFraming) continue;
    const original = getDoorEntranceAnimationConfig(p);
    const source = JSON.stringify(Array.from({ length: 11 }, (_, i) => original.getState(i / 10)));
    const opening = original.timelineEvents!.find(e => e.id === "opening-start");
    const timing: Record<string, number> = opening ? { "opening-start": opening.atMs + 10 } : {};
    const wait = info.supportsOpeningWait ? 300 : 0;
    const timingOnly = getDoorEntranceAnimationConfig(p, timing, { openingWaitMs: wait });
    const combined = getDoorEntranceAnimationConfig(p, timing, {
      initialHeightPercent: 80, ...(info.approachAtMs ? { approachHeightPercent: 120 } : {}),
      cameraHoldMs: 200, cameraPace: 1.2, openingWaitMs: wait,
    });
    assert.ok(Math.abs(projectedDoorHeight(combined.getState(0), p.type === "single" ? 3 : 6) - 80) < .01);
    for (const progress of [0, .2, .6, .95, 1]) {
      const { cameraPosition: _p, cameraTarget: _t, ...state } = combined.getState(progress);
      const { cameraPosition: _op, cameraTarget: _ot, ...expected } = timingOnly.getState(progress);
      assert.deepEqual(state, expected);
    }
    assert.deepEqual(combined.getState(1), timingOnly.getState(1));
    assert.equal(JSON.stringify(Array.from({ length: 11 }, (_, i) => getDoorEntranceAnimationConfig(p).getState(i / 10))), source);
  }
});

test("framing matches independent Three projection of the actual renderer front/back planes", async () => {
  const THREE = await import("three");
  for (const height of [80, 160, 200]) {
    const config = getDoorEntranceAnimationConfig(preset, {}, { initialHeightPercent: height });
    const state = config.getState(0), camera = new THREE.PerspectiveCamera(60, 1.6, .1, 100);
    camera.position.set(...state.cameraPosition); camera.lookAt(...state.cameraTarget); camera.updateMatrixWorld(true);
    const ys = [];
    for (const x of [-1.5, 1.5]) for (const y of [-3, 3]) for (const z of [-.002, .162]) {
      ys.push(new THREE.Vector3(x, y, z).project(camera).y);
    }
    assert.ok(Math.abs((Math.max(...ys) - Math.min(...ys)) * 50 - height) < .01);
  }
});
test("sampling captures a validated draft snapshot instead of mutable caller data", () => {
  const draft = { cameraHoldMs: 200, cameraPace: 1.2 };
  const config = getDoorEntranceAnimationConfig(preset, {}, draft), before = config.getState(.3);
  draft.cameraPace = 999; draft.cameraHoldMs = 4700;
  assert.deepEqual(config.getState(.3), before);
});

test("phone framing replaces only heights and preserves shared timing and source snapshots", async () => {
  const authoring = await import("../cameraAuthoring.ts");
  assert.equal(typeof authoring.resolvePhoneCameraDraft, "function", "phone framing resolver must exist");
  const shared = { initialHeightPercent: 90, approachHeightPercent: 120, cameraPace: 1.3, cameraHoldMs: 200, openingWaitMs: 300 };
  const phone = { initialHeightPercent: 70, offsetXPercent: 10, offsetYPercent: -5 };
  const resolved = authoring.resolvePhoneCameraDraft(shared, phone);
  assert.deepEqual(resolved, { ...shared, initialHeightPercent: 70 });
  const base = getDoorEntranceAnimationConfig(preset, {}, shared);
  const mobile = getDoorEntranceAnimationConfig(preset, {}, resolved);
  assert.equal(base.duration, mobile.duration);
  assert.deepEqual(base.timelineEvents, mobile.timelineEvents);
  for (const t of [0, .2, .6, .95, 1]) {
    const { cameraPosition: _p, cameraTarget: _t, ...rest } = mobile.getState(t);
    const { cameraPosition: _bp, cameraTarget: _bt, ...expected } = base.getState(t);
    assert.deepEqual(rest, expected);
  }
  assert.deepEqual(authoring.resolvePhoneCameraDraft(shared, {}), shared);
  phone.initialHeightPercent = 150; shared.cameraPace = 2;
  assert.equal(resolved.initialHeightPercent, 70);
  assert.equal(resolved.cameraPace, 1.3);
});

test("phone framing rejects invalid values without accepting independent timing", async () => {
  const authoring = await import("../cameraAuthoring.ts");
  assert.equal(typeof authoring.resolvePhoneCameraDraft, "function", "phone framing resolver must exist");
  for (const phone of [{ initialHeightPercent: 19 }, { approachHeightPercent: 201 },
    { offsetXPercent: NaN }, { offsetYPercent: Infinity }, { offsetXPercent: 51 },
    { offsetYPercent: -51 }, { cameraPace: 2 }]) {
    assert.throws(() => authoring.resolvePhoneCameraDraft({}, phone), /phone framing/i);
  }
  assert.deepEqual(authoring.resolvePhoneCameraDraft({}, { offsetXPercent: -50, offsetYPercent: 50 }), {});
});
