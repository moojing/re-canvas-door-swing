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

  it("derives a downward press direction from a left-facing imported lever", () => {
    const scene = new THREE.Group();
    const root = new THREE.Group();
    root.name = "door_handle";

    const lever = new THREE.Group();
    lever.name = "handle";
    const grip = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2));
    grip.position.x = -1;
    lever.add(grip);
    root.add(lever);
    scene.add(root);

    const prepared = prepareHandleModel(scene);

    assert.equal(prepared?.pressRotationMultiplier, 1);
  });

  it("scales imported models by the moving lever length", () => {
    const scene = new THREE.Group();
    const root = new THREE.Group();
    root.name = "door_handle";

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2));
    panel.name = "panel";
    root.add(panel);

    const lever = new THREE.Group();
    lever.name = "handle";
    const grip = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2));
    grip.position.x = 1;
    lever.add(grip);
    root.add(lever);
    scene.add(root);

    const prepared = prepareHandleModel(scene);

    assert.equal(Number(prepared?.scale.toFixed(3)), 0.3);
  });

  it("applies the fallback handle material color to imported handles", () => {
    const scene = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: "#ffffff" })
    );
    handle.name = "door_handle";
    scene.add(handle);

    const prepared = prepareHandleModel(scene);

    let material: THREE.MeshStandardMaterial | undefined;
    prepared?.object.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        material = mesh.material;
      }
    });

    assert.ok(material);
    assert.equal(`#${material.color.getHexString()}`, "#74685c");
    assert.equal(material.roughness, 0.55);
    assert.equal(material.metalness, 0.65);
  });
});
