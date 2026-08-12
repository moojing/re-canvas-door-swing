import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapAnimationProgressToSoundProgress } from "../soundWindow.ts";

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
});
