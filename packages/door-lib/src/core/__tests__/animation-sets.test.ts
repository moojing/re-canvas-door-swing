import assert from "node:assert/strict";
import { test } from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { getDoorEntranceAnimationSet, getAnimationSetProfile } from "../animationSets.ts";
import { doorEntrancePresets, getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";
import type { DoorAnimationSetId } from "../types.ts";

const iron = getDoorEntrancePreset("biohazard-1996-a01-iron-door");
const leave = getDoorEntrancePreset("biohazard-1996-a01-iron-door-leave");
const yellow = getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door");

test("all released presets explicitly select a compatible immutable set", () => {
  for (const preset of doorEntrancePresets) {
    const set = getDoorEntranceAnimationSet(preset)!;
    assert.ok(preset.animationSet);
    assert.equal(set.id, preset.animationSet);
    assert.equal(set.motion, preset.motion);
    assert.equal(set.animationStyle, preset.animationStyle);
    assert.ok(Object.isFrozen(set));
    assert.equal("profile" in set, false);
  }
  assert.equal(iron.animationSet, "1996-single-micro-open-advance");
  assert.equal(leave.animationSet, "1996-single-wide-swing-advance");
  assert.equal(yellow.animationSet, "1996-single-micro-open-close-pass-advance");
});

test("same set shares exact tracks, easing, markers and sound crop except optional handle", () => {
  const a = getAnimationSetProfile(iron);
  const b = getAnimationSetProfile(getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door-leave"));
  for (const key of ["doorAngle", "cameraPosition", "cameraTarget", "fadeOut",
    "soundStartMs", "soundEndMs", "soundSourceStartProgress", "soundSourceEndProgress", "durationMs"] as const) {
    assert.deepEqual(a[key], b[key], key);
  }
  assert.deepEqual(a.events, b.events.filter(({ id }) => id !== "handle-start"));
  assert.ok(b.handleAngle.some(({ value }) => value > 0));
  assert.ok(a.handleAngle.every(({ value }) => value === 0));
  const yellowLeave = getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door-leave");
  assert.deepEqual(getAnimationSetProfile(yellowLeave), b);
  assert.deepEqual(getAnimationSetProfile({ ...yellowLeave, id: iron.id }), b);
});

test("invalid explicit sets throw rather than silently using an era default", () => {
  assert.throws(() => getDoorEntranceAnimationConfig({ ...iron, animationSet: "unknown" as DoorAnimationSetId }), /Unknown animation set/);
  assert.throws(() => getDoorEntranceAnimationConfig({ ...iron, motion: "hinge-double" }), /requires motion/);
  assert.throws(() => getDoorEntranceAnimationConfig({ ...iron, animationStyle: "biohazard-1998" }), /requires style/);
  assert.throws(() => getDoorEntranceAnimationConfig({ ...iron, animationStyle: undefined }), /requires style/);
});

test("style-only fallback is independent of ID; unstyled legacy remains untouched", () => {
  const fallback = getDoorEntranceAnimationConfig({ ...leave, animationSet: undefined });
  assert.equal(fallback.duration, getDoorEntranceAnimationConfig(iron).duration);
  assert.deepEqual(fallback.getState(0.9), getDoorEntranceAnimationConfig(iron).getState(0.9));
  assert.equal(getDoorEntranceAnimationSet({ ...iron, animationStyle: undefined, animationSet: undefined }), undefined);
  assert.throws(() => getDoorEntranceAnimationConfig({ ...iron, animationStyle: undefined, animationSet: undefined }, { "slight-open": 3000 }), /Legacy animation/);
});

test("wide swing has a distinct path and retiming/reset keeps its marker contract", () => {
  const config = getDoorEntranceAnimationConfig(leave);
  assert.equal(config.duration, 4700);
  assert.ok(config.getState(1).doorAngle > 0.7);
  assert.equal(getDoorEntranceAnimationConfig(iron).getState(1).doorAngle, 30 / 90);
  const edited = getDoorEntranceAnimationConfig(leave, { "opening-resumes": 3750 });
  assert.equal(edited.timelineEvents!.find(({ id }) => id === "opening-resumes")!.atMs, 3750);
  assert.deepEqual(getDoorEntranceAnimationConfig(leave).getState(0.9), config.getState(0.9));
  assert.throws(() => getDoorEntranceAnimationConfig(leave, { "hold-end": 4000 }), /Cannot edit animation event/);
});

test("double and other-era profiles retain their authored timing and end states", () => {
  for (const [id, duration, slightMs] of [
    ["biohazard-1996-b02-blue-panel-double-door", 4900, 3500],
    ["biohazard-1998-a01-no-handle-door", 4400, 2000],
    ["biohazard-1999-a01-parking-door", 4800, undefined],
  ] as const) {
    const preset = getDoorEntrancePreset(id);
    const config = getDoorEntranceAnimationConfig(preset);
    const fallback = getDoorEntranceAnimationConfig({ ...preset, animationSet: undefined });
    assert.equal(config.duration, duration);
    assert.equal(config.timelineEvents!.find(({ id }) => id === "slight-open")?.atMs, slightMs);
    assert.equal(config.getState(1).doorAngle, 1);
    assert.equal(config.getState(1).fadeOut, 1);
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      assert.deepEqual(config.getState(progress), fallback.getState(progress));
    }
  }
});


test("micro-open set stays visible longer before its shared 200 ms fade", () => {
  for (const id of [iron.id, yellow.id, "biohazard-1996-a02-yellow-panel-knob-door-leave"] as const) {
    const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
    assert.equal(config.duration, 5000);
    assert.equal(config.timelineEvents!.find(({ id }) => id === "fade-start")!.atMs, 4800);
    assert.equal(config.getState(4700 / config.duration).fadeOut, 0);
    assert.equal(config.getState(4800 / config.duration).fadeOut, 0);
    assert.equal(config.getState(4900 / config.duration).fadeOut, 0.5);
    assert.equal(config.getState(1).fadeOut, 1);
  }
});


test("iron Leave wide swing crosses its middle without a speed dip", () => {
  const config = getDoorEntranceAnimationConfig(leave);
  const angleAt = (ms: number) => config.getState(ms / config.duration).doorAngle * 90;
  assert.ok(Math.abs(angleAt(4150) - 30) < 1e-8);
  assert.ok(Math.abs(angleAt(4550) - 65) < 1e-8);
  const expectedStep = (65 - 30) / 8;
  for (let ms = 4150; ms < 4550; ms += 50) {
    assert.ok(Math.abs(angleAt(ms + 50) - angleAt(ms) - expectedStep) < 1e-8,
      `wide swing changes speed at ${ms} ms`);
  }
  assert.equal(config.timelineEvents!.find(({ id }) => id === "fade-start")!.atMs, 4580);
  assert.equal(config.duration, 4700);
  assert.ok(Math.abs(angleAt(4700) - 72) < 1e-8);
});


test("iron Leave crops both vertical edges during the close approach", () => {
  const config = getDoorEntranceAnimationConfig(leave);
  const camera = new PerspectiveCamera(60, 640 / 400, 0.1, 100);
  for (const ms of [1350, 3350, 3650, 4150, 4350, 4550, 4580]) {
    const state = config.getState(ms / config.duration);
    camera.position.set(...state.cameraPosition);
    camera.lookAt(...state.cameraTarget);
    camera.updateMatrixWorld();
    // The six-unit leaf's stationary right hinge edge spans y=-3 to y=3.
    const top = new Vector3(1.5, 3, 0).project(camera).y;
    const bottom = new Vector3(1.5, -3, 0).project(camera).y;
    assert.ok(top > 1.15, `door top is not visibly cropped at ${ms} ms`);
    assert.ok(bottom < -1.15, `door bottom is not visibly cropped at ${ms} ms`);
    assert.ok(Math.abs(top + bottom) < 1e-8, `vertical crop is unbalanced at ${ms} ms`);
  }
});


test("iron Leave starts with a near-full-height door before approaching", () => {
  const state = getDoorEntranceAnimationConfig(leave).getState(0);
  const camera = new PerspectiveCamera(60, 640 / 400, 0.1, 100);
  camera.position.set(...state.cameraPosition);
  camera.lookAt(...state.cameraTarget);
  camera.updateMatrixWorld();
  const top = new Vector3(1.5, 3, 0).project(camera).y;
  const bottom = new Vector3(1.5, -3, 0).project(camera).y;
  const heightFraction = (top - bottom) / 2;
  assert.ok(heightFraction >= 0.88 && heightFraction <= 0.94,
    `initial door occupies ${heightFraction * 100}% of the frame height`);
  assert.ok(top < 1 && bottom > -1, "initial framing must retain both edges");
});


test("yellow Enter reaches its side-on close passage before fade without changing its micro hold or other presets", () => {
  const config = getDoorEntranceAnimationConfig(yellow);
  assert.equal(config.getState(3300 / config.duration).doorAngle * 90, 10);
  assert.equal(config.getState(3700 / config.duration).doorAngle * 90, 10);
  assert.ok(Math.abs(config.getState(4800 / config.duration).doorAngle * 90 - 64) < 1e-8);
  assert.ok(Math.abs(config.getState(1).doorAngle * 90 - 64) < 1e-8);
  assert.equal(getDoorEntranceAnimationConfig(iron).getState(1).doorAngle * 90, 30);
  const yellowLeave = getDoorEntrancePreset("biohazard-1996-a02-yellow-panel-knob-door-leave");
  assert.equal(getDoorEntranceAnimationConfig(yellowLeave).getState(1).doorAngle * 90, 30);
  const a = getAnimationSetProfile(yellow);
  const b = getAnimationSetProfile(yellowLeave);
  for (const key of ["cameraTarget", "fadeOut", "handleAngle", "durationMs", "soundStartMs", "soundEndMs"] as const) {
    assert.deepEqual(a[key], b[key], key);
  }
});


test("yellow Enter late silhouette has the source-like side edge / front ratio", () => {
  const config = getDoorEntranceAnimationConfig(yellow);
  const state = config.getState(4800 / config.duration);
  const camera = new PerspectiveCamera(60, 1.6, 0.1, 100);
  camera.position.set(...state.cameraPosition);
  camera.lookAt(...state.cameraTarget);
  camera.updateMatrixWorld();
  const angle = -state.doorAngle * Math.PI / 2;
  const x = (leafX: number, depth: number) => new Vector3(
    leafX * Math.cos(angle) + depth * Math.sin(angle) - 1.5,
    0, -leafX * Math.sin(angle) + depth * Math.cos(angle)
  ).project(camera).x;
  const frontWidth = x(3, 0.16) - x(0, 0.16);
  const edgeWidth = Math.abs(x(3, 0) - x(3, 0.16));
  // Source near 6.53 s: visible side edge / front ratio about 0.8.
  assert.ok(edgeWidth / frontWidth > 0.6 && edgeWidth / frontWidth < 1);
  assert.ok((frontWidth + edgeWidth) / 2 > 0.12 && (frontWidth + edgeWidth) / 2 < 0.20);
});
