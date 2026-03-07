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
  getHandlePressWithBounce,
  lerp,
} from "../shared";
import { DoorHandleModel } from "../HandleModel";

const MAX_HANDLE_PRESS_ANGLE = (60 * Math.PI) / 180;
const MAX_DOOR_SWING_RADIANS = Math.PI / 2;
const SINGLE_HANDLE_POSITION: [number, number, number] = [2.26, -0.02, 0.32];

export const topDownConfig: DoorAnimationConfig = {
  id: "top-down-entry",
  label: "Overhead Entry",
  description: "俯視下降後靠近門再淡出",
  duration: 6500,
  progressMarkers: [0, 0.2, 0.35, 0.6, 0.85, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number, context) => {
    const progress = clamp(rawProgress, 0, 1);
    const handleProgress = clamp(context?.linearProgress ?? rawProgress, 0, 1);
    let doorAngle = 0;
    let fadeOut = 0;
    const handleAngle =
      getHandlePressWithBounce(handleProgress, {
        pressStart: 0.49,
        pressEnd: 0.58,
        bounceEnd: 0.68,
        releaseStart: 0.9,
        releaseEnd: 1,
        downBounce: 0.09,
        releaseBounce: 0.12,
        motionSpeed: 1,
      }) * MAX_HANDLE_PRESS_ANGLE;

    const startPosition: [number, number, number] = [-3.8, 6, 5.2];
    const midHoverPosition: [number, number, number] = [-2.6, 3.8, 5];
    const frontPrepPosition: [number, number, number] = [-1.2, 2, 4.6];
    const closeApproachPosition: [number, number, number] = [-0.4, 0.8, 3.4];
    const finalFadePosition: [number, number, number] = [0, 0, 0.8];

    let cameraPosition: [number, number, number] = [...startPosition];

    if (progress <= 0.35) {
      const t = progress / 0.35;
      cameraPosition = lerp(startPosition, midHoverPosition, t);
      doorAngle = 0;
    } else if (progress <= 0.62) {
      const t = (progress - 0.35) / 0.27;
      cameraPosition = lerp(midHoverPosition, frontPrepPosition, t);
      doorAngle = 0;
    } else if (progress <= 0.87) {
      const t = (progress - 0.62) / 0.25;
      doorAngle = t;
      cameraPosition = lerp(frontPrepPosition, closeApproachPosition, t);
    } else {
      const t = (progress - 0.87) / 0.13;
      doorAngle = 1;
      cameraPosition = lerp(closeApproachPosition, finalFadePosition, t);
      fadeOut = clamp(t, 0, 1);
    }

    return {
      doorAngle,
      handleAngle,
      cameraPosition,
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
        <mesh position={[1.5, 0, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={doorTexture} />
        </mesh>

        {handleModelUrl ? (
          <DoorHandleModel
            position={SINGLE_HANDLE_POSITION}
            modelUrl={handleModelUrl}
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

export const TopDownEntryRenderer: DoorAnimationRenderer = ({
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
