import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDoorAnimationConfig } from "../animationState.ts";

describe("core animation state", () => {
  it("clamps direct-entry state at closed and complete progress", () => {
    const config = getDoorAnimationConfig("direct-entry");

    const closed = config.getState(0, { linearProgress: 0 });
    const complete = config.getState(1, { linearProgress: 1 });

    assert.equal(closed.fadeOut >= 0, true);
    assert.equal(complete.fadeOut <= 1, true);
    assert.notEqual(closed.doorAngle, complete.doorAngle);
  });
});
