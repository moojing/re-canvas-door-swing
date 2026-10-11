import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSoundVolume, getSoundPlaybackRate, mapAnimationProgressToSoundProgress } from "../soundWindow.ts";

describe("core sound window", () => {
  it("maps animation progress into the configured sound window", () => {
    assert.equal(
      mapAnimationProgressToSoundProgress(0.25, {
        soundStartProgress: 0.25,
        soundEndProgress: 0.75,
      }),
      0
    );

    assert.equal(
      mapAnimationProgressToSoundProgress(0.75, {
        soundStartProgress: 0.25,
        soundEndProgress: 0.75,
      }),
      1
    );
  });

  it("fits a cropped source into the styled timeline sound window", () => {
    assert.equal(getSoundPlaybackRate(4000, 5000, {
      soundStartProgress: 0.25,
      soundEndProgress: 0.75,
      soundSourceStartProgress: 0.1,
      soundSourceEndProgress: 0.9,
    }), 1.28);
    assert.equal(getSoundPlaybackRate(Number.NaN, 5000, {}), null);
    assert.equal(getSoundPlaybackRate(4000, 0, {}), null);
  });
});

it("sound tail holds, fades to silence and resets without affecting legacy windows", () => {
  const window = { soundFadeOutStartProgress: 0.8, soundEndProgress: 1 };
  assert.equal(getSoundVolume(0.75, window), 1);
  assert.ok(Math.abs(getSoundVolume(0.9, window) - 0.5) < 1e-9);
  assert.equal(getSoundVolume(1, window), 0);
  assert.equal(getSoundVolume(0, window), 1);
  assert.equal(getSoundVolume(1, {}), 1);
});
