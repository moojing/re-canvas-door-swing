import assert from "node:assert/strict";
import { test } from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";
import type { DoorEntrancePresetId } from "../types.ts";

const boundsAt = (id: DoorEntrancePresetId, ms: number) => {
  const preset = getDoorEntrancePreset(id);
  const config = getDoorEntranceAnimationConfig(preset);
  const state = config.getState(ms / config.duration);
  const camera = new PerspectiveCamera(60, 1.6, 0.1, 100);
  camera.position.set(...state.cameraPosition);
  camera.lookAt(...state.cameraTarget);
  camera.updateMatrixWorld();
  const halfWidth = preset.type === "double" ? 3 : 1.5;
  const corners = [-halfWidth, halfWidth].flatMap(x => [3, -3].map(y => {
    const point = new Vector3(x, y, 0.162).project(camera);
    return { x: (point.x + 1) * 640, y: (1 - point.y) * 400 };
  }));
  const left = Math.min(...corners.map(p => p.x));
  const right = Math.max(...corners.map(p => p.x));
  return { width: right - left, center: (left + right) / 2,
    top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) };
};
const near = (value: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(value - expected) <= tolerance, `${label}: ${value}, expected ${expected} ±${tolerance}`);

for (const [id, ms, width, top, center] of [
  ["biohazard-1996-a01-iron-door", 1200, 410, 104, 638],
  ["biohazard-1996-a01-iron-door-leave", 1350, 411, 104, 638],
  ["biohazard-1996-a02-yellow-panel-knob-door", 1200, 410, 104, 638],
  ["biohazard-1996-a02-yellow-panel-knob-door-leave", 1200, 411, 104, 638],
  ["biohazard-1998-a01-no-handle-door", 1000, 404, 54, 678],
  ["biohazard-1998-a03-grid-knob-door", 1000, 404, 46, 676],
  ["biohazard-1998-a03-grid-knob-door-leave", 1000, 404, 46, 676],
  ["biohazard-1996-b02-blue-panel-double-door", 1200, 824, 103, 638],
  ["biohazard-1996-b07-automatic-sliding-door", 1900, 811, 107, 638],
  ["biohazard-1996-b07-automatic-sliding-door-leave", 1900, 811, 107, 638],
] as const) {
  test(`${id} aligns the closed hold using width and top independently of bottom crop`, () => {
    const b = boundsAt(id, ms);
    near(b.width, width, width * 0.025, "closed width");
    near(b.top, top, 12, "closed top");
    near(b.center, center, 10, "closed center");
    assert.ok(b.bottom > 795, "source closed hold reaches/crops the lower frame edge");
  });
}
for (const id of ["biohazard-1996-a01-iron-door", "biohazard-1996-a01-iron-door-leave"] as const) {
  test(`${id} begins with the smaller fully visible reference silhouette`, () => {
    const b = boundsAt(id, 0);
    near(b.width, 302, 18, "initial width");
    near(b.top, 185, 20, "initial top");
    assert.ok(b.bottom < 825, "initial lower edge is not deeply cropped");
  });
}
test("sliding keeps its small initial shot and approaches until1900ms before its unchanged opening", () => {
  const id = "biohazard-1996-b07-automatic-sliding-door";
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
  const initial = boundsAt(id, 0);
  near(initial.width, 425, 15, "sliding initial width");
  near(initial.top, 244, 15, "sliding initial top");
  assert.ok(boundsAt(id, 1900).width > boundsAt(id, 1600).width + 30);
  assert.equal(config.timelineEvents!.find(e => e.id === "approach-end")!.atMs, 1900);
  assert.equal(config.timelineEvents!.find(e => e.id === "opening-start")!.atMs, 3350);
  assert.deepEqual(config.getState(1900 / config.duration).cameraPosition,
    config.getState(3300 / config.duration).cameraPosition);
});
for (const id of ["biohazard-1998-a01-no-handle-door", "biohazard-1998-a03-grid-knob-door", "biohazard-1998-a03-grid-knob-door-leave"] as const) {
  test(`${id} keeps fixed closed framing rather than confusing fade with approach`, () => {
    const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
    assert.deepEqual(boundsAt(id, 0), boundsAt(id, 1500));
    for (let ms = 50; ms <= config.duration; ms += 50) {
      const a = config.getState((ms - 50) / config.duration);
      const b = config.getState(ms / config.duration);
      assert.ok(b.cameraPosition[2] <= a.cameraPosition[2] + 1e-8, `camera backs away at ${ms}`);
    }
  });
}

test("parking fits the off-center initial shot and the tapered closed-wait silhouette", () => {
  const id = "biohazard-1999-a01-parking-door";
  const initial = boundsAt(id, 0);
  near(initial.width, 342, 12, "parking initial width");
  near(initial.top, 135, 15, "parking initial top");
  near(initial.center, 666, 12, "parking initial center");
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
  const state = config.getState(2300 / config.duration);
  const camera = new PerspectiveCamera(60, 1.6, 0.1, 100);
  camera.position.set(...state.cameraPosition);
  camera.lookAt(...state.cameraTarget);
  camera.updateMatrixWorld();
  const edgeXAt = (x: number, screenY: number) => {
    const a = new Vector3(x, 3, 0.162).project(camera);
    const b = new Vector3(x, -3, 0.162).project(camera);
    const y = 1 - screenY / 400;
    return (a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y) + 1) * 640;
  };
  const topWidth = edgeXAt(1.5, 0) - edgeXAt(-1.5, 0);
  const bottomWidth = edgeXAt(1.5, 793) - edgeXAt(-1.5, 793);
  near(topWidth, 579, 18, "parking visible top width");
  near(bottomWidth, 519, 18, "parking visible bottom width");
  near((edgeXAt(1.5, 0) + edgeXAt(-1.5, 0)) / 2, 591, 12, "parking wait center");
  assert.ok(topWidth > bottomWidth + 35, "source wait is tapered, not a centered rectangle");
});

test("no-handle framing rejoins the authored passage endpoint before fading", () => {
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset("biohazard-1998-a01-no-handle-door"));
  const passage = config.getState(4000 / config.duration);
  assert.deepEqual(passage.cameraPosition, [0, 0, 1.4]);
  assert.deepEqual(passage.cameraTarget, [0, 0, 0]);
  assert.deepEqual(config.getState(1).cameraPosition, [0, 0, 0.5]);
});
