import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import {
  HandleProfileId,
  DoorAnimationConfig,
  DoorAnimationRenderer,
} from "../../types";
import { directEntryConfig as coreDirectEntryConfig } from "../../../core/animationState.ts";
import { DoorHandleModel } from "../HandleModel";

const MAX_DOOR_SWING_RADIANS = Math.PI / 2;
const SINGLE_HANDLE_POSITION: [number, number, number] = [2.26, -0.02, 0.32];

export const directEntryConfig: DoorAnimationConfig = coreDirectEntryConfig;

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
