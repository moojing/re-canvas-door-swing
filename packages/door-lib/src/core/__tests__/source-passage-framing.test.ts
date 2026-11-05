import assert from "node:assert/strict";
import { test } from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { getDoorEntrancePreset } from "../presets.ts";
import { getDoorEntranceAnimationConfig } from "../presetAnimation.ts";
import type { DoorEntrancePresetId } from "../types.ts";

// Approximate 1280x800 MP4 landmarks, not recovered source-engine parameters.
function silhouette(id: DoorEntrancePresetId, ms: number) {
  const preset = getDoorEntrancePreset(id);
  const config = getDoorEntranceAnimationConfig(preset);
  const state = config.getState(ms / config.duration);
  const camera = new PerspectiveCamera(60, 1.6, 0.1, 100);
  camera.position.set(...state.cameraPosition);
  camera.lookAt(...state.cameraTarget);
  camera.updateMatrixWorld();
  const hinge = preset.hingeSide === "right" ? 1.5 : -1.5;
  const angle = state.doorAngle * Math.PI / 2
    * (preset.swingDirection === "away-from-viewer" ? -1 : 1) * (hinge > 0 ? 1 : -1);
  const viewPoints = [0, hinge > 0 ? -3 : 3].flatMap(x => [-3, 3].flatMap(y => [-0.002, 0.162].map(z => {
    const p = new Vector3(hinge + x * Math.cos(angle) + z * Math.sin(angle), y,
      -x * Math.sin(angle) + z * Math.cos(angle)).applyMatrix4(camera.matrixWorldInverse);
    return p;
  })));
  // Clip the solid leaf against the near plane before projection. Outward
  // leaves may cross it; projecting vertices behind the camera inverts bounds.
  const clipped = viewPoints.filter(p => p.z <= -camera.near);
  for (let i = 0; i < viewPoints.length; i += 1) {
    for (let j = i + 1; j < viewPoints.length; j += 1) {
      const a = viewPoints[i], b = viewPoints[j];
      if ((a.z < -camera.near) !== (b.z < -camera.near)) {
        clipped.push(a.clone().lerp(b, (-camera.near - a.z) / (b.z - a.z)));
      }
    }
  }
  const points = clipped.map(point => {
    const p = point.clone().applyMatrix4(camera.projectionMatrix);
    return { x: (p.x + 1) * 640, y: (1 - p.y) * 400 };
  });
  const intersections: number[] = [];
  for (const a of points) for (const b of points) {
    if ((a.y <= 400 && b.y >= 400 || b.y <= 400 && a.y >= 400) && a.y !== b.y) {
      intersections.push(a.x + (b.x - a.x) * (400 - a.y) / (b.y - a.y));
    }
  }
  const scanLeft = Math.max(0, Math.min(...intersections));
  const scanRight = Math.min(1280, Math.max(...intersections));
  const left = Math.min(...points.map(p => p.x));
  const right = Math.max(...points.map(p => p.x));
  const top = Math.min(...points.map(p => p.y));
  const bottom = Math.max(...points.map(p => p.y));
  return { left, right, top, bottom, width: right - left, height: bottom - top,
    scanLeft, scanRight, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
}
const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual}, expected ${expected} ±${tolerance}`);

test("S9 middle approach matches the taller, lower, narrow open leaf in the MP4", () => {
  const b = silhouette("biohazard-1996-a02-red-cross-running-door", 2320);
  near(b.height, 474, 35, "mid-shot height");
  near(b.width, 54, 20, "mid-shot width");
  near(b.centerX, 513, 25, "mid-shot horizontal center");
  near(b.centerY, 487, 20, "mid-shot vertical center");
});
for (const [id, center] of [
  ["biohazard-1999-a02-iron-window-door", 768],
  ["biohazard-1999-a02-iron-window-door-leave", 590],
] as const) {
  test(`${id} preserves the source's off-center cropped closed framing`, () => {
    const b = silhouette(id, 1920);
    near(b.centerX, center, 45, "closed center");
    near(b.width, 550, 50, "closed width");
    assert.ok(b.top < 0 && b.bottom > 800, "closed approach crops both vertical edges");
  });
}
test("iron-window Enter recedes to the right during the visible passage", () => {
  const b = silhouette("biohazard-1999-a02-iron-window-door", 4080);
  assert.ok(b.left > 770 && b.left < 920, `passage free edge ${b.left}`);
});
test("iron-window Leave has nearly passed out of the left side before picture fade", () => {
  const id = "biohazard-1999-a02-iron-window-door-leave";
  const b = silhouette(id, 4540);
  assert.ok(b.scanRight - b.scanLeft < 200,
    `late visible geometry remains too broad: ${b.left}..${b.right}`);
  assert.ok(b.scanRight > 120 && b.scanRight < 240, `late free edge ${b.scanRight}`);
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset(id));
  assert.equal(config.getState(4540 / config.duration).fadeOut, 0,
    "achieve passage with geometry, not an earlier black overlay");
});

test("iron-window Enter advances continuously through its fitted passage landmarks", () => {
  const config = getDoorEntranceAnimationConfig(getDoorEntrancePreset("biohazard-1999-a02-iron-window-door"));
  const z = (ms: number) => config.getState(ms / config.duration).cameraPosition[2];
  for (const ms of [2920, 3200, 3520, 4080, 4400]) {
    const before = (z(ms - 1) - z(ms)) * 1000;
    const after = (z(ms) - z(ms + 1)) * 1000;
    assert.ok(Math.abs(before - after) < 0.02,
      `camera velocity jumps at ${ms}ms: ${before} to ${after}`);
  }
});

// Full closed-approach samples at160ms intervals expose an oversized zoom or
// early target pan that matching only the final closed pose cannot detect.
for (const [id, samples] of [
  ["biohazard-1999-a02-iron-window-door", [
    [160, 502, 832], [320, 502, 832], [480, 497, 840], [640, 488, 850],
    [800, 489, 878], [960, 491, 921], [1120, 493, 943], [1280, 496, 989],
    [1440, 505, 1031], [1600, 504, 1028], [1760, 504, 1028],
  ]],
  ["biohazard-1999-a02-iron-window-door-leave", [
    [160, 504, 831], [320, 497, 833], [480, 497, 841], [640, 490, 851],
    [800, 461, 854], [960, 434, 854], [1120, 396, 856], [1280, 356, 860],
    [1440, 335, 856], [1600, 333, 853], [1760, 333, 853], [1920, 333, 853],
  ]],
] as const) {
  test(`${id} follows the entire MP4 approach rather than zooming from an invented distant start`, () => {
    for (const [ms, left, right] of samples) {
      const b = silhouette(id, ms);
      near(b.scanLeft, left, 20, `approach left at ${ms}ms`);
      near(b.scanRight, right, 20, `approach right at ${ms}ms`);
    }
  });
}
