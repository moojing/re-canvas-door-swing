import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { createAgedHandleMaterial, prepareHandleModel } from "../handleModel.ts";

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

  it("normalizes imported handles to an aged non-glowing metal", () => {
    const scene = new THREE.Group();
    const brightSourceTexture = new THREE.Texture();
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.2, 0.2),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: 1,
        map: brightSourceTexture,
        metalness: 1,
        roughness: 0.1,
      })
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
    assert.notEqual(material.map, brightSourceTexture);
    assert.ok(material.map instanceof THREE.DataTexture);
    assert.equal(material.map.image.width, 64);
    assert.equal(material.map.image.height, 64);
    assert.equal(`#${material.color.getHexString()}`, "#8f6d3c");
    assert.equal(`#${material.emissive.getHexString()}`, "#000000");
    assert.equal(material.emissiveIntensity, 0);
    assert.equal(material.roughness, 0.97);
    assert.equal(material.metalness, 0.08);
    assert.equal(material.envMapIntensity, 0);

    const pixels = material.map.image.data as Uint8Array | Uint8ClampedArray;
    let hasAgedBrass = false;
    let hasSoftTarnish = false;
    let hasVerdigris = false;
    let blackSpeckleCount = 0;
    let darkFreckleCount = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue] = pixels.slice(index, index + 3);
      hasAgedBrass ||= red > 190 && green > 140 && blue < 85;
      hasSoftTarnish ||= red > 110 && red < 190 && green > 85 && green < 145 && blue < 75;
      hasVerdigris ||= green > red && green > blue && green > 80;
      if (red < 85 && green < 70 && blue < 55) {
        blackSpeckleCount += 1;
      }
      if (red < 170 && green < 130 && blue < 75) {
        darkFreckleCount += 1;
      }
    }
    const blackSpeckleRatio = blackSpeckleCount / (pixels.length / 4);
    const darkFreckleRatio = darkFreckleCount / (pixels.length / 4);
    assert.equal(hasAgedBrass, true);
    assert.equal(hasSoftTarnish, true);
    assert.equal(hasVerdigris, true);
    assert.equal(blackSpeckleCount, 0);
    assert.equal(
      darkFreckleRatio < 0.05,
      true,
      `Expected low-frequency tarnish, received ${(darkFreckleRatio * 100).toFixed(2)}% dark freckles`
    );
  });

  it("uses a single unnamed mesh as an imported knob fallback", () => {
    const scene = new THREE.Group();
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8));
    knob.name = "Sheet_109_remesh.003_Material.001_0";
    scene.add(knob);

    const prepared = prepareHandleModel(scene);

    assert.ok(prepared);
    assert.equal(prepared.object.name, "Sheet_109_remesh.003_Material.001_0");
    assert.deepEqual(prepared.pressTargets, []);
    assert.ok(prepared.scale > 0);
  });

  it("creates an aged procedural fallback material", () => {
    const material = createAgedHandleMaterial();

    assert.equal(`#${material.color.getHexString()}`, "#8f6d3c");
    assert.ok(material.map instanceof THREE.DataTexture);
    assert.equal(material.roughness, 0.97);
    assert.equal(material.metalness, 0.08);
    assert.equal(material.envMapIntensity, 0);
    assert.equal(`#${material.emissive.getHexString()}`, "#000000");
  });
});

it("shipped knob keeps its base fixed while the grip turns about its shaft", async () => {
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(new URL("../assets/models/door_knob.glb", import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binary = bytes.subarray(28 + jsonLength);
  // Reconstruct the shipped geometry and transforms without browser texture loading.
  const nodes: THREE.Object3D[] = gltf.nodes.map((node: { name?: string; mesh?: number; matrix?: number[]; rotation?: number[] }) => {
    let object: THREE.Object3D = new THREE.Group();
    if (node.mesh !== undefined) {
      const primitive = gltf.meshes[node.mesh].primitives[0];
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      const view = gltf.bufferViews[accessor.bufferView];
      const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      const positions = new Float32Array(accessor.count * 3);
      for (let i = 0; i < positions.length; i++) positions[i] = binary.readFloatLE(offset + i * 4);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    }
    object.name = node.name ?? "";
    if (node.matrix) object.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    return object;
  });
  gltf.nodes.forEach((node: { children?: number[] }, index: number) => {
    node.children?.forEach((child) => nodes[index].add(nodes[child]));
  });
  const prepared = prepareHandleModel(nodes[0]);
  assert.ok(prepared);
  assert.equal(prepared.pressTargets.length, 1);
  assert.equal(prepared.pressTargets[0].node.name, "grip");
  const base = prepared.object.getObjectByName("knob_base");
  assert.ok(base);
  prepared.object.updateMatrixWorld(true);
  const before = base.matrixWorld.clone();
  const grip = prepared.pressTargets[0].node;
  const shaftPoint = new THREE.Vector3(0, 0, 1).applyMatrix4(grip.matrixWorld);
  const surfacePoint = new THREE.Vector3(1, 0, 0).applyMatrix4(grip.matrixWorld);
  grip.rotation.z += 65 * Math.PI / 180;
  prepared.object.updateMatrixWorld(true);
  assert.deepEqual(base.matrixWorld.elements, before.elements);
  assert.ok(shaftPoint.distanceTo(new THREE.Vector3(0, 0, 1).applyMatrix4(grip.matrixWorld)) < 1e-6);
  assert.ok(surfacePoint.distanceTo(new THREE.Vector3(1, 0, 0).applyMatrix4(grip.matrixWorld)) > 0.1);
});
