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
const HANDLE_TEXTURE_TINT = "#8f6d3c";
const HANDLE_METALNESS = 0.08;
const HANDLE_ROUGHNESS = 0.97;
const HANDLE_ENV_MAP_INTENSITY = 0;
const AGED_HANDLE_TEXTURE_SIZE = 64;

export interface PreparedHandleModel {
  object: THREE.Object3D;
  scale: number;
  pressRotationMultiplier: 1 | -1;
  pressTargets: Array<{ node: THREE.Object3D; baseRotation: THREE.Euler }>;
}

const loader = new GLTFLoader();
const sceneCache = new Map<string, Promise<THREE.Object3D>>();
let agedHandleTexture: THREE.DataTexture | null = null;

const createAgedHandleTexture = () => {
  const size = AGED_HANDLE_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;
      const grain = Math.sin(x * 0.22 + y * 0.08) * 0.5 + 0.5;
      const tarnishWave =
        Math.sin(nx * 11.4 + ny * 4.2) * 0.34 +
        Math.sin(nx * 3.1 - ny * 8.6) * 0.32 +
        Math.sin((nx + ny) * 7.8) * 0.2 +
        0.5;
      const tarnish = Math.max(0, Math.min(1, (tarnishWave - 0.72) / 0.28));
      const verdigrisPatch = Math.max(
        0,
        1 -
          Math.hypot((nx - 0.28) / 0.2, (ny - 0.72) / 0.16)
      );
      const verdigris = Math.pow(verdigrisPatch, 2.4) * 0.72;
      const wear = 0.96 + grain * 0.08;
      const brass = [222, 176, 68];
      const aged = [154, 118, 48];
      const copperGreen = [104, 132, 92];
      const agedMix = tarnish * 0.42;
      const greenMix = verdigris;
      const brassMix = Math.max(0, 1 - agedMix - greenMix);

      data[index] = Math.min(
        255,
        Math.round((brass[0] * brassMix + aged[0] * agedMix + copperGreen[0] * greenMix) * wear)
      );
      data[index + 1] = Math.min(
        255,
        Math.round((brass[1] * brassMix + aged[1] * agedMix + copperGreen[1] * greenMix) * wear)
      );
      data[index + 2] = Math.min(
        255,
        Math.round((brass[2] * brassMix + aged[2] * agedMix + copperGreen[2] * greenMix) * wear)
      );
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = "procedural-aged-handle";
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.82, 0.82);
  texture.needsUpdate = true;
  return texture;
};

const getAgedHandleTexture = () => {
  agedHandleTexture ??= createAgedHandleTexture();
  return agedHandleTexture;
};

export const createAgedHandleMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: HANDLE_TEXTURE_TINT,
    emissive: "#000000",
    emissiveIntensity: 0,
    envMapIntensity: HANDLE_ENV_MAP_INTENSITY,
    map: getAgedHandleTexture(),
    metalness: HANDLE_METALNESS,
    roughness: HANDLE_ROUGHNESS,
  });

const toVintageMetal = (material: THREE.Material) => {
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    const next = material.clone();
    next.color.set(HANDLE_TEXTURE_TINT);
    next.map = getAgedHandleTexture();
    next.metalness = HANDLE_METALNESS;
    next.roughness = HANDLE_ROUGHNESS;
    next.envMapIntensity = HANDLE_ENV_MAP_INTENSITY;
    next.emissive.set("#000000");
    next.emissiveIntensity = 0;
    if (next instanceof THREE.MeshPhysicalMaterial) {
      next.clearcoat = 0;
      next.clearcoatRoughness = 1;
    }
    next.needsUpdate = true;
    return next;
  }

  return createAgedHandleMaterial();
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

  if (fallback) return { node: fallback, name: fallbackName };

  const meshes: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes.push(object);
  });

  if (meshes.length === 1) {
    return { node: meshes[0], name: meshes[0].name };
  }

  return null;
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
