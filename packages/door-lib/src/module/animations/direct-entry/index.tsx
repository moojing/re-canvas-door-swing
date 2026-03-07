import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import {
  DoorAnimationConfig,
  DoorAnimationRenderer,
} from "../../types";
import {
  clamp,
  easeInOutCubic,
  getDoorSwingWithBounce,
  getHandlePressProgress,
} from "../shared";
import { DoorHandleModel } from "../HandleModel";

const MAX_HANDLE_PRESS_ANGLE = Math.PI / 7;
const MAX_DOOR_SWING_RADIANS = Math.PI / 4;

export const directEntryConfig: DoorAnimationConfig = {
  id: "direct-entry",
  label: "Direct Entry",
  description: "正面開門並往前推進",
  duration: 5000,
  progressMarkers: [0, 0.2, 0.4, 0.6, 0.8, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    const doorAngle = getDoorSwingWithBounce(progress, {
      start: 0.18,
      end: 0.62,
      bounce: 0.08,
      damping: 18,
      frequency: 32,
    });
    let cameraDistance = 1;
    let fadeOut = 0;
    const handleAngle =
      getHandlePressProgress(progress, {
        pressEnd: 0.12,
        holdEnd: 0.18,
        releaseEnd: 0.3,
      }) * MAX_HANDLE_PRESS_ANGLE;

    if (progress <= 0.18) {
      cameraDistance = 1;
    } else if (progress <= 0.62) {
      const doorProgress = (progress - 0.18) / 0.44;
      cameraDistance = 1 + doorProgress * 0.3;
    } else if (progress <= 0.9) {
      const forwardProgress = (progress - 0.62) / 0.28;
      cameraDistance = 1.3 + forwardProgress * 1.2;
    } else {
      const fadeProgress = (progress - 0.9) / 0.1;
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
}: {
  doorAngle: number;
  handleAngle: number;
  textureUrl: string;
  handleModelUrl?: string;
}) => {
  const doorGroupRef = useRef<any>(null);
  const doorTexture = (useLoader as unknown as any)(
    THREE.TextureLoader,
    textureUrl
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

        {handleModelUrl ? (
          <DoorHandleModel
            position={[2.4, 0, 0.24]}
            modelUrl={handleModelUrl}
            pressAngle={handleAngle}
          />
        ) : (
          <mesh position={[2.4, 0, 0.24]}>
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
}) => {
  return (
    <SingleDoor
      doorAngle={state.doorAngle}
      handleAngle={state.handleAngle ?? 0}
      textureUrl={textureUrl}
      handleModelUrl={handleModelUrl}
    />
  );
};
