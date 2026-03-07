import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const HANDLE_NODE_NAME_CANDIDATES = [
  "door_handle",
  "Door Handle 3_1",
  "Metal Handle_7",
  "Object_6",
  "Object_18",
];
const DEFAULT_HANDLE_SCALE = 0.18;
const HANDLE_SCALE_BY_NAME: Record<string, number> = {
  door_handle: 0.035,
};
const VINTAGE_METAL_COLOR = "#8f8a7f";
const VINTAGE_METALNESS = 0.82;
const VINTAGE_METAL_ROUGHNESS = 0.46;

interface DoorHandleModelProps {
  position: [number, number, number];
  modelUrl: string;
  mirrorX?: boolean;
}

const FallbackHandle = ({ position }: { position: [number, number, number] }) => (
  <mesh position={position}>
    <sphereGeometry args={[0.08]} />
    <meshStandardMaterial
      color={VINTAGE_METAL_COLOR}
      metalness={VINTAGE_METALNESS}
      roughness={VINTAGE_METAL_ROUGHNESS}
    />
  </mesh>
);

const toVintageMetalMaterial = (material: THREE.Material): THREE.Material => {
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    const mat = material.clone();
    mat.side = THREE.DoubleSide;
    mat.color.set(VINTAGE_METAL_COLOR);
    mat.metalness = Math.max(mat.metalness, VINTAGE_METALNESS);
    mat.roughness = VINTAGE_METAL_ROUGHNESS;
    mat.needsUpdate = true;
    return mat;
  }

  const legacy = material as THREE.Material & {
    color?: THREE.Color;
    map?: THREE.Texture | null;
    normalMap?: THREE.Texture | null;
    transparent?: boolean;
    opacity?: number;
  };

  return new THREE.MeshStandardMaterial({
    color: legacy.color?.clone().multiply(new THREE.Color(VINTAGE_METAL_COLOR)) ??
      new THREE.Color(VINTAGE_METAL_COLOR),
    map: legacy.map ?? null,
    normalMap: legacy.normalMap ?? null,
    metalness: VINTAGE_METALNESS,
    roughness: VINTAGE_METAL_ROUGHNESS,
    transparent: legacy.transparent ?? false,
    opacity: legacy.opacity ?? 1,
    side: THREE.DoubleSide,
  });
};

export const DoorHandleModel = ({
  position,
  modelUrl,
  mirrorX = false,
}: DoorHandleModelProps) => {
  const gltf = (useLoader as unknown as any)(GLTFLoader, modelUrl) as any;

  const handleSelection = useMemo(() => {
    const originalScene = gltf?.scene as THREE.Object3D | undefined;
    const scene = originalScene?.clone(true);
    if (!scene) {
      return null;
    }

    scene.updateMatrixWorld(true);

    let source: THREE.Object3D | null = null;
    let sourceName = "";
    for (const candidate of HANDLE_NODE_NAME_CANDIDATES) {
      const match = scene.getObjectByName(candidate);
      if (match) {
        source = match;
        sourceName = candidate;
        break;
      }
    }

    if (!source) {
      scene.traverse((obj) => {
        if (source || !obj.name) return;
        if (obj.name.toLowerCase().includes("metal handle")) {
          source = obj;
          sourceName = obj.name;
        }
      });
    }

    if (!source) {
      return null;
    }

    // Preserve the selected node world transform while detaching from source hierarchy.
    scene.attach(source);

    const centeredHandle = source;
    centeredHandle.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(centeredHandle);
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      centeredHandle.position.sub(center);
    }
    centeredHandle.updateMatrixWorld(true);

    // Force a consistent "old metal" look regardless of source material type.
    centeredHandle.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;

      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(toVintageMetalMaterial)
        : toVintageMetalMaterial(mesh.material);
    });

    const resolvedScale =
      HANDLE_SCALE_BY_NAME[sourceName] ?? DEFAULT_HANDLE_SCALE;

    return {
      object: centeredHandle,
      scale: resolvedScale,
    };
  }, [gltf]);

  if (!handleSelection) {
    return <FallbackHandle position={position} />;
  }

  const handleScale = handleSelection.scale;
  const scaleX = mirrorX ? -handleScale : handleScale;

  return (
    <group position={position} scale={[scaleX, handleScale, handleScale]}>
      <primitive object={handleSelection.object} />
    </group>
  );
};
