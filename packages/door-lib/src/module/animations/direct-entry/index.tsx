import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import {
  HandleProfileId,
  DoorAnimationConfig,
  DoorAnimationRenderer,
} from "../../types";
import { clamp, easeInOutCubic } from "../shared";
import { DoorHandleModel } from "../HandleModel";
import { getHandlePressAngle } from "../../handles/motion";

const MAX_DOOR_SWING_RADIANS = Math.PI / 2;
const SINGLE_HANDLE_POSITION: [number, number, number] = [2.26, -0.02, 0.32];

export const directEntryConfig: DoorAnimationConfig = {
  id: "direct-entry",
  label: "Direct Entry",
  description: "正面開門並往前推進",
  duration: 5000,
  progressMarkers: [0, 0.2, 0.4, 0.6, 0.8, 1],
  soundStartProgress: 0.37,
  soundEndProgress: 0.88,
  soundSourceStartProgress: 0.06,
  easing: easeInOutCubic,
  getState: (rawProgress: number, context) => {
    const progress = clamp(rawProgress, 0, 1);
    const handleProgress = clamp(context?.linearProgress ?? rawProgress, 0, 1);
    const handleProfileId = context?.handleProfileId;
    let doorAngle = 0;
    let cameraDistance = 1;
    let fadeOut = 0;
    const handleAngle = getHandlePressAngle({
      profileId: handleProfileId,
      variant: "direct-entry",
      progress: handleProgress,
    });

    if (progress <= 0.18) {
      doorAngle = 0;
      cameraDistance = 1;
    } else if (progress <= 0.62) {
      const doorProgress = (progress - 0.18) / 0.44;
      doorAngle = doorProgress;
      cameraDistance = 1 + doorProgress * 0.3;
    } else if (progress <= 0.9) {
      const forwardProgress = (progress - 0.62) / 0.28;
      doorAngle = 1;
      cameraDistance = 1.3 + forwardProgress * 1.2;
    } else {
      const fadeProgress = (progress - 0.9) / 0.1;
      doorAngle = 1;
      cameraDistance = 2.5;
      fadeOut = clamp(fadeProgress, 0, 1);
    }

    const cameraZ = 8 - (cameraDistance - 1) * 5;

    return {
      doorAngle,
      handleAngle,
      cameraPosition: [0, 0, cameraZ],
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

const SingleDoor = ({
  doorAngle,
  handleAngle,
  textureUrl,
  handleModelUrl,
  handleProfileId,
}: {
  doorAngle: number;
  handleAngle: number;
  textureUrl: string;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
}) => {
  const doorGroupRef = useRef<any>(null);
  const doorTexture = (useLoader as unknown as any)(
    THREE.TextureLoader,
    textureUrl,
  ) as any;

  useEffect(() => {
    if (doorTexture) {
      doorTexture.wrapS = doorTexture.wrapT = THREE.ClampToEdgeWrapping;
      doorTexture.repeat.set(1, 1);
      doorTexture.offset.set(0, 0);
      doorTexture.flipY = false;
      doorTexture.needsUpdate = true;
    }
  }, [doorTexture]);

  useFrame(() => {
    if (doorGroupRef.current) {
      doorGroupRef.current.rotation.y = -doorAngle * MAX_DOOR_SWING_RADIANS;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[3.2, 6.2, 0.2]} />
        <meshLambertMaterial color="#2d2520" />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 6, 0.1]} />
        <meshLambertMaterial color="#1a1510" />
      </mesh>

      <group ref={doorGroupRef} position={[-1.5, 0, 0]}>
        <mesh position={[1.5, 0, 0.08]}>
          <boxGeometry args={[3, 6, 0.15]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>

        <mesh position={[1.5, 0, 0.16]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={doorTexture} />
        </mesh>
        <mesh position={[1.5, 0, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={doorTexture} />
        </mesh>

        {handleModelUrl ? (
          <DoorHandleModel
            position={SINGLE_HANDLE_POSITION}
            modelUrl={handleModelUrl}
            profileId={handleProfileId}
            pressAngle={handleAngle}
          />
        ) : (
          <mesh position={SINGLE_HANDLE_POSITION}>
            <sphereGeometry args={[0.08]} />
            <meshLambertMaterial color="#78643c" />
          </mesh>
        )}
      </group>
    </group>
  );
};

export const DirectEntryRenderer: DoorAnimationRenderer = ({
  state,
  textureUrl,
  handleModelUrl,
  handleProfileId,
}) => {
  return (
    <SingleDoor
      doorAngle={state.doorAngle}
      handleAngle={state.handleAngle ?? 0}
      textureUrl={textureUrl}
      handleModelUrl={handleModelUrl}
      handleProfileId={handleProfileId}
    />
  );
};
