import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDoorEntranceController } from "../controller.ts";

describe("door entrance controller", () => {
  it("calls progress and complete callbacks during playback", () => {
    const progressEvents: number[] = [];
    let completed = false;

    const controller = createDoorEntranceController({
      preset: "single-lever-wood",
      onProgress: (progress) => progressEvents.push(progress),
      onComplete: () => {
        completed = true;
      },
    });

    controller.seek(0.5);
    controller.seek(1);

    assert.deepEqual(progressEvents, [0.5, 1]);
    assert.equal(completed, true);
  });

  it("clamps progress and completes once", () => {
    const progressEvents: number[] = [];
    let completeCount = 0;

    const controller = createDoorEntranceController({
      preset: "single-lever-wood",
      onProgress: (progress) => progressEvents.push(progress),
      onComplete: () => {
        completeCount += 1;
      },
    });

    controller.seek(-1);
    controller.seek(2);
    controller.seek(1);

    assert.deepEqual(progressEvents, [0, 1, 1]);
    assert.equal(completeCount, 1);
    assert.equal(controller.getSnapshot().progress, 1);
  });

  it("reset updates preset and progress state", () => {
    const controller = createDoorEntranceController({
      preset: "single-lever-wood",
    });

    controller.seek(0.75);
    controller.reset({ preset: "double-lever-wood", progress: 0.25 });

    const snapshot = controller.getSnapshot();

    assert.equal(snapshot.progress, 0.25);
    assert.equal(snapshot.preset.id, "double-lever-wood");
    assert.equal(snapshot.animation.id, "double-swing");
    assert.equal(snapshot.isPlaying, false);
  });

  it("stop cancels playback state", () => {
    const controller = createDoorEntranceController({
      preset: "single-overhead-lever-wood",
    });

    controller.play();
    assert.equal(controller.getSnapshot().isPlaying, true);

    controller.stop();

    assert.equal(controller.getSnapshot().isPlaying, false);
  });

  it("restarts playback from the beginning after completion", () => {
    let completeCount = 0;
    const controller = createDoorEntranceController({
      preset: "single-lever-wood",
      onComplete: () => {
        completeCount += 1;
      },
    });

    controller.seek(1);
    controller.play();

    const replaySnapshot = controller.getSnapshot();

    assert.equal(replaySnapshot.progress, 0);
    assert.equal(replaySnapshot.isPlaying, true);

    controller.seek(1);

    assert.equal(completeCount, 2);
    assert.equal(controller.getSnapshot().isPlaying, false);
  });
});
