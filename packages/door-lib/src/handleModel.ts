import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const NODE_NAME_CANDIDATES = [
  "door_handle",
  "Door Handle 3_1",
  "Metal Handle_7",
  "Object_6",
  "Object_18",
];
const TARGET_HANDLE_SIZE = 0.72;
const PRESS_HINTS = ["handle", "lever", "grip"];
const STATIC_HINTS = [
  "door_handle",
  "base",
  "panel",
  "plate",
  "backplate",
  "lock",
  "key",
  "screw",
  "rosette",
];
const HANDLE_COLOR = "#6f665b";

export interface PreparedHandleModel {
  object: THREE.Object3D;
  scale: number;
  pressTargets: Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>;
}

const loader = new GLTFLoader();
const sceneCache = new Map<string, Promise<THREE.Object3D>>();

const toVintageMetal = (material: THREE.Material) => {
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    const next = material.clone();
    next.color.set(HANDLE_COLOR);
    next.metalness = Math.max(next.metalness, 0.72);
    next.roughness = 0.68;
    next.needsUpdate = true;
    return next;
  }

  return new THREE.MeshStandardMaterial({
    color: HANDLE_COLOR,
    metalness: 0.72,
    roughness: 0.68,
  });
};

const pickHandleNode = (scene: THREE.Object3D) => {
  for (const name of NODE_NAME_CANDIDATES) {
    const match = scene.getObjectByName(name);
    if (match) return { node: match, name };
  }

  let fallback: THREE.Object3D | null = null;
  let fallbackName = "";
  scene.traverse((object) => {
    if (fallback || !object.name) return;
    const lower = object.name.toLowerCase();
    if (
      lower.includes("handle") ||
      lower.includes("knob") ||
      lower.includes("grip")
    ) {
      fallback = object;
      fallbackName = object.name;
    }
  });

  return fallback ? { node: fallback, name: fallbackName } : null;
};

export const loadHandleScene = (url: string) => {
  const cached = sceneCache.get(url);
  if (cached) return cached;

  const pending = loader.loadAsync(url).then((gltf) => gltf.scene);
  sceneCache.set(url, pending);
  return pending;
};

export const prepareHandleModel = (
  sourceScene: THREE.Object3D
): PreparedHandleModel | null => {
  const scene = sourceScene.clone(true);
  scene.updateMatrixWorld(true);
  const picked = pickHandleNode(scene);
  if (!picked) return null;

  scene.attach(picked.node);
  picked.node.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(picked.node);
  if (!bounds.isEmpty()) {
    picked.node.position.sub(bounds.getCenter(new THREE.Vector3()));
  }
  picked.node.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(picked.node).getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z, Number.EPSILON);

  picked.node.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(toVintageMetal)
      : toVintageMetal(mesh.material);
  });

  const pressCandidates: THREE.Object3D[] = [];
  picked.node.traverse((object) => {
    if (object === picked.node || !object.name) return;
    const lower = object.name.toLowerCase();
    const isPress = PRESS_HINTS.some((hint) => lower.includes(hint));
    const isStatic = STATIC_HINTS.some((hint) => lower.includes(hint));
    if (isPress && !isStatic) pressCandidates.push(object);
  });

  const pressSet = new Set(pressCandidates);
  const pressTargets = pressCandidates
    .filter((candidate) => {
      let parent = candidate.parent;
      while (parent && parent !== picked.node) {
        if (pressSet.has(parent)) return false;
        parent = parent.parent;
      }
      return true;
    })
    .map((node) => ({ node, baseRotation: node.rotation.clone() }));

  return {
    object: picked.node,
    scale: TARGET_HANDLE_SIZE / longest,
    pressTargets,
  };
};
