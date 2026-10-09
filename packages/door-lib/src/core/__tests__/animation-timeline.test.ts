import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleTrack, validateTrack, warpTime } from "../animationTimeline.ts";

describe("absolute animation tracks", () => {
  const door = [
    { atMs: 0, value: 0 },
    { atMs: 300, value: 0.08 },
    { atMs: 650, value: 0.08 },
    { atMs: 1500, value: 1 },
  ];

  it("holds a slightly open leaf and returns the same state after reverse seek", () => {
    assert.equal(sampleTrack(door, 1500, 500), 0.08);
    assert.equal(sampleTrack(door, 1500, 300), 0.08);
    assert.equal(sampleTrack(door, 1500, 650), 0.08);
    assert.equal(sampleTrack(door, 1500, 0), 0);
    assert.equal(sampleTrack(door, 1500, 1500), 1);
    assert.equal(sampleTrack(door, 1500, 500), 0.08);
  });

  it("interpolates vector camera tracks and clamps outside the timeline", () => {
    const camera = [
      { atMs: 0, value: [0, 0, 8] as [number, number, number] },
      { atMs: 1000, value: [0, 1, 4] as [number, number, number] },
    ];
    assert.deepEqual(sampleTrack(camera, 1000, 500), [0, 0.5, 6]);
    assert.deepEqual(sampleTrack(camera, 1000, -10), [0, 0, 8]);
    assert.deepEqual(sampleTrack(camera, 1000, 1100), [0, 1, 4]);
  });

  it("applies easing only within its own segment", () => {
    const track = [
      { atMs: 0, value: 0, easing: "ease-in" as const },
      { atMs: 100, value: 1 },
      { atMs: 200, value: 2 },
    ];
    assert.equal(sampleTrack(track, 200, 50), 0.25);
    assert.equal(sampleTrack(track, 200, 150), 1.5);
  });

  it("rejects malformed tracks instead of silently changing timing", () => {
    assert.throws(() => validateTrack(door, 0), /duration/i);
    assert.throws(() => validateTrack([{ atMs: 0, value: 0 }, { atMs: 50, value: 1 }, { atMs: 50, value: 1 }, { atMs: 100, value: 1 }], 100), /order/i);
    assert.throws(() => validateTrack([{ atMs: 0, value: 0 }, { atMs: 100, value: Number.NaN }], 100), /finite/i);
    assert.throws(() => validateTrack([{ atMs: 1, value: 0 }, { atMs: 100, value: 1 }], 100), /start/i);
  });

  it("warps event segments while retaining fixed start and end anchors", () => {
    const oldAnchors = [0, 300, 650, 1500];
    const newAnchors = [0, 300, 850, 1500];
    assert.equal(warpTime(500, oldAnchors, newAnchors), 300 + (200 / 350) * 550);
    assert.equal(warpTime(0, oldAnchors, newAnchors), 0);
    assert.equal(warpTime(1500, oldAnchors, newAnchors), 1500);
  });
});
