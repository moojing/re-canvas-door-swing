import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDoorAnimationConfig } from "../animationState.ts";

const assertClose = (actual: number, expected: number) => {
  assert.equal(Math.abs(actual - expected) < 0.000001, true);
};

describe("core animation state", () => {
  it("maps direct-entry milestones through opening, approach, and fade", () => {
    const config = getDoorAnimationConfig("direct-entry");

    const closed = config.getState(0, { linearProgress: 0 });
    const opening = config.getState(0.4, { linearProgress: 0.4 });
    const complete = config.getState(1, { linearProgress: 1 });

    assert.equal(closed.doorAngle, 0);
    assert.equal(closed.fadeOut, 0);
    assert.deepEqual(closed.cameraPosition, [0, 0, 8]);

    assertClose(opening.doorAngle, 0.5);
    assert.equal(opening.fadeOut, 0);
    assertClose(opening.cameraPosition[2], 7.25);

    assertClose(complete.doorAngle, 1);
    assertClose(complete.fadeOut, 1);
    assertClose(complete.cameraPosition[2], 0.5);
  });

  it("maps single-top-down milestones through overhead approach and final fade", () => {
    const config = getDoorAnimationConfig("single-top-down-entry");

    const overhead = config.getState(0, { linearProgress: 0 });
    const opening = config.getState(0.75, { linearProgress: 0.75 });
    const complete = config.getState(1, { linearProgress: 1 });

    assert.equal(overhead.doorAngle, 0);
    assert.equal(overhead.fadeOut, 0);
    assert.deepEqual(overhead.cameraPosition, [-3.8, 6, 5.2]);

    assertClose(opening.doorAngle, 0.52);
    assert.equal(opening.fadeOut, 0);
    assert.deepEqual(
      opening.cameraPosition.map((value) => Number(value.toFixed(3))),
      [-0.784, 1.376, 3.976]
    );

    assertClose(complete.doorAngle, 1);
    assertClose(complete.fadeOut, 1);
    assert.deepEqual(
      complete.cameraPosition.map((value) => Number(value.toFixed(3))),
      [0, 0, -1.2]
    );
  });

  it("maps double-swing milestones with independent left and right door angles", () => {
    const config = getDoorAnimationConfig("double-swing");

    const closed = config.getState(0, { linearProgress: 0 });
    const opening = config.getState(0.43, { linearProgress: 0.43 });
    const complete = config.getState(1, { linearProgress: 1 });

    assert.equal(closed.doorAngle, 0);
    assert.equal(closed.rightDoorAngle, 0);
    assert.equal(closed.fadeOut, 0);

    assertClose(opening.doorAngle, 0.5);
    assertClose(opening.rightDoorAngle ?? Number.NaN, 0.5);
    assert.equal(opening.fadeOut, 0);
    assertClose(opening.cameraPosition[2], 7.09);

    assert.equal(complete.doorAngle, 1);
    assert.equal(complete.rightDoorAngle, 1);
    assertClose(complete.fadeOut, 1);
    assertClose(complete.cameraPosition[2], 0.46);
  });
});
