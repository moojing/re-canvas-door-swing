import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceC03Playback,
  createC03PlaybackState,
  resetC03Playback,
  scrubC03Playback,
  startC03Playback,
  stopC03Playback,
} from "./c03Playback.ts";

test("advances playback to completion from its current progress", () => {
  const started = startC03Playback(createC03PlaybackState(0.25), 1000);

  assert.equal(started.state.playing, true);
  assert.ok(advanceC03Playback(started.state, started.startTime, 1000).progress >= 0.25);
  const completed = advanceC03Playback(started.state, started.startTime, started.startTime + 6500);

  assert.deepEqual(completed, { progress: 1, playing: false });
});

test("stopping preserves progress while reset returns to the beginning", () => {
  const playing = startC03Playback(createC03PlaybackState(0.4), 1000).state;

  assert.deepEqual(stopC03Playback(playing), { progress: 0.4, playing: false });
  assert.deepEqual(resetC03Playback(), { progress: 0, playing: false });
});

test("scrubbing clamps to the animation bounds and stops playback", () => {
  assert.deepEqual(scrubC03Playback(-1), { progress: 0, playing: false });
  assert.deepEqual(scrubC03Playback(0.5), { progress: 0.5, playing: false });
  assert.deepEqual(scrubC03Playback(2), { progress: 1, playing: false });
});
