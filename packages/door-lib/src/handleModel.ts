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
const TARGET_PRESS_HANDLE_LENGTH = 0.6;
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
const HANDLE_COLOR = "#74685c";
const HANDLE_METALNESS = 0.65;
const HANDLE_ROUGHNESS = 0.55;

export interface PreparedHandleModel {
  object: THREE.Object3D;
  scale: number;
  pressRotationMultiplier: 1 | -1;
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
    next.metalness = HANDLE_METALNESS;
    next.roughness = HANDLE_ROUGHNESS;
    next.needsUpdate = true;
    return next;
  }

  return new THREE.MeshStandardMaterial({
    color: HANDLE_COLOR,
    metalness: HANDLE_METALNESS,
    roughness: HANDLE_ROUGHNESS,
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

const getLocalBoundsCenter = (node: THREE.Object3D) => {
  node.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(node);
  if (bounds.isEmpty()) return null;

  const center = bounds.getCenter(new THREE.Vector3());
  return node.worldToLocal(center);
};

const getPressRotationMultiplier = (
  pressTargets: Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>
): 1 | -1 => {
  for (const { node } of pressTargets) {
    const center = getLocalBoundsCenter(node);
    if (!center || Math.abs(center.x) < 0.000001) continue;
    return center.x < 0 ? 1 : -1;
  }

  return -1;
};

const getScaleBasisSize = (
  object: THREE.Object3D,
  pressTargets: Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>
) => {
  const pressBounds = new THREE.Box3();
  for (const { node } of pressTargets) {
    pressBounds.union(new THREE.Box3().setFromObject(node));
  }

  if (!pressBounds.isEmpty()) {
    const pressSize = pressBounds.getSize(new THREE.Vector3());
    return {
      size: Math.max(pressSize.x, pressSize.y, pressSize.z, Number.EPSILON),
      target: TARGET_PRESS_HANDLE_LENGTH,
    };
  }

  const objectSize = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  return {
    size: Math.max(objectSize.x, objectSize.y, objectSize.z, Number.EPSILON),
    target: TARGET_HANDLE_SIZE,
  };
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
  const scaleBasis = getScaleBasisSize(picked.node, pressTargets);

  return {
    object: picked.node,
    scale: scaleBasis.target / scaleBasis.size,
    pressRotationMultiplier: getPressRotationMultiplier(pressTargets),
    pressTargets,
  };
};
