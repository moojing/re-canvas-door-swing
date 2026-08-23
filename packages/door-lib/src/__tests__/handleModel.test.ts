import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { prepareHandleModel } from "../handleModel.ts";

describe("imported handle model", () => {
  it("centers the named door_handle node and keeps a fallback when missing", () => {
    const scene = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.2));
    handle.name = "door_handle";
    handle.position.set(4, 1, 0);
    scene.add(handle);

    const prepared = prepareHandleModel(scene);
    assert.ok(prepared);
    assert.ok((prepared?.scale ?? 0) > 0);

    const empty = prepareHandleModel(new THREE.Group());
    assert.equal(empty, null);
  });
});
