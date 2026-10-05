import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSoundPlaybackRate, mapAnimationProgressToSoundProgress } from "../soundWindow.ts";

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
