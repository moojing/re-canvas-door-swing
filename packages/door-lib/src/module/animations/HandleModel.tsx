import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getHandleProfile } from "../handles/profiles";
import { HandleProfileId } from "../types";

const DEFAULT_PROFILE_ID: HandleProfileId = "lever-l";

interface DoorHandleModelProps {
  position: [number, number, number];
  modelUrl: string;
  profileId?: HandleProfileId;
  mirrorX?: boolean;
  pressAngle?: number;
}

interface PressTarget {
  node: THREE.Object3D;
  baseRotation: THREE.Euler;
}

const resolveMaterialSide = (side: "front" | "double") =>
  side === "double" ? THREE.DoubleSide : THREE.FrontSide;

const FallbackHandle = ({
  position,
  profileId = DEFAULT_PROFILE_ID,
}: {
  position: [number, number, number];
  profileId?: HandleProfileId;
}) => {
  const profile = getHandleProfile(profileId);
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08 * profile.sizeMultiplier]} />
      <meshStandardMaterial
        color={profile.material.color}
        metalness={profile.material.metalness}
        roughness={profile.material.roughness}
        side={resolveMaterialSide(profile.material.side)}
      />
    </mesh>
  );
};

const toVintageMetalMaterial = (
  material: THREE.Material,
  profileId: HandleProfileId
): THREE.Material => {
  const profile = getHandleProfile(profileId);

  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    const mat = material.clone();
    mat.side = resolveMaterialSide(profile.material.side);
    mat.color.set(profile.material.color);
    mat.metalness = Math.max(mat.metalness, profile.material.metalness);
    mat.roughness = profile.material.roughness;
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
    color: legacy.color?.clone().multiply(new THREE.Color(profile.material.color)) ??
      new THREE.Color(profile.material.color),
    map: legacy.map ?? null,
    normalMap: legacy.normalMap ?? null,
    metalness: profile.material.metalness,
    roughness: profile.material.roughness,
    transparent: legacy.transparent ?? false,
    opacity: legacy.opacity ?? 1,
    side: resolveMaterialSide(profile.material.side),
  });
};

export const DoorHandleModel = ({
  position,
  modelUrl,
  profileId = DEFAULT_PROFILE_ID,
  mirrorX = false,
  pressAngle = 0,
}: DoorHandleModelProps) => {
  const gltf = (useLoader as unknown as any)(GLTFLoader, modelUrl) as any;

  const handleSelection = useMemo(() => {
    const profile = getHandleProfile(profileId);
    const originalScene = gltf?.scene as THREE.Object3D | undefined;
    const scene = originalScene?.clone(true);
    if (!scene) {
      return null;
    }

    scene.updateMatrixWorld(true);

    let source: THREE.Object3D | null = null;
    let sourceName = "";
    for (const candidate of profile.nodeNameCandidates) {
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
        const lower = obj.name.toLowerCase();
        if (
          lower.includes("handle") ||
          lower.includes("knob") ||
          lower.includes("grip")
        ) {
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
        ? mesh.material.map((mat) => toVintageMetalMaterial(mat, profileId))
        : toVintageMetalMaterial(mesh.material, profileId);
    });

    const pressTargetCandidates: THREE.Object3D[] = [];
    centeredHandle.traverse((obj) => {
      if (obj === centeredHandle || !obj.name) return;

      const lowerName = obj.name.toLowerCase();
      const matchesPressHint = profile.pressNodeHints.some((hint) =>
        lowerName.includes(hint)
      );
      const matchesStaticHint = profile.staticNodeHints.some((hint) =>
        lowerName.includes(hint)
      );

      if (matchesPressHint && !matchesStaticHint) {
        pressTargetCandidates.push(obj);
      }
    });

    const pressTargetSet = new Set(pressTargetCandidates);
    const pressTargets: PressTarget[] = pressTargetCandidates
      .filter((candidate) => {
        let parent: THREE.Object3D | null = candidate.parent;
        while (parent && parent !== centeredHandle) {
          if (pressTargetSet.has(parent)) {
            return false;
          }
          parent = parent.parent;
        }
        return true;
      })
      .map((node) => ({
        node,
        baseRotation: node.rotation.clone(),
      }));

    const resolvedScale =
      profile.scaleByNodeName?.[sourceName] ?? profile.defaultScale;

    return {
      object: centeredHandle,
      scale: resolvedScale,
      pressTargets,
      sizeMultiplier: profile.sizeMultiplier,
    };
  }, [gltf, profileId]);

  if (!handleSelection) {
    return <FallbackHandle position={position} profileId={profileId} />;
  }

  const handleScale = handleSelection.scale * handleSelection.sizeMultiplier;
  const scaleX = mirrorX ? -handleScale : handleScale;
  const signedPressAngle = (mirrorX ? -1 : 1) * pressAngle;
  const hasPressTargets = handleSelection.pressTargets.length > 0;

  useEffect(() => {
    if (!hasPressTargets) return;

    for (const target of handleSelection.pressTargets) {
      target.node.rotation.set(
        target.baseRotation.x,
        target.baseRotation.y,
        target.baseRotation.z + signedPressAngle
      );
    }
  }, [handleSelection, hasPressTargets, signedPressAngle]);

  return (
    <group position={position}>
      <group
        rotation={hasPressTargets ? [0, 0, 0] : [0, 0, signedPressAngle]}
        scale={[scaleX, handleScale, handleScale]}
      >
        <primitive object={handleSelection.object} />
      </group>
    </group>
  );
};
