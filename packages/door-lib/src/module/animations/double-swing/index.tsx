import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import {
  HandleProfileId,
  DoorAnimationConfig,
  DoorAnimationRenderer,
} from "../../types";
import { doubleSwingConfig as coreDoubleSwingConfig } from "../../../core/animationState.ts";
import { DoorHandleModel } from "../HandleModel";

const MAX_DOOR_SWING_RADIANS = Math.PI / 2;
const DOUBLE_HANDLE_Y = -0.02;
const DOUBLE_HANDLE_Z = 0.32;
const DOUBLE_HANDLE_X = 2.26;

export const doubleSwingConfig: DoorAnimationConfig = coreDoubleSwingConfig;

const DoubleDoor = ({
  leftAngle,
  rightAngle,
  handleAngle,
  frontTextureUrl,
  edgeTextureUrl,
  backTextureUrl,
  handleModelUrl,
  handleProfileId,
}: {
  leftAngle: number;
  rightAngle: number;
  handleAngle: number;
  frontTextureUrl: string;
  edgeTextureUrl: string;
  backTextureUrl: string;
  handleModelUrl?: string;
  handleProfileId?: HandleProfileId;
}) => {
  const leftRef = useRef<any>(null);
  const rightRef = useRef<any>(null);
  const [frontTexture, edgeTexture, backTexture] = (useLoader as unknown as any)(
    THREE.TextureLoader,
    [frontTextureUrl, edgeTextureUrl, backTextureUrl],
  ) as any[];

  useEffect(() => {
    [frontTexture, edgeTexture, backTexture].forEach((texture) => {
      if (!texture) return;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
      texture.offset.set(0, 0);
      texture.flipY = false;
      texture.needsUpdate = true;
    });
  }, [backTexture, edgeTexture, frontTexture]);

  useFrame(() => {
    if (leftRef.current) {
      leftRef.current.rotation.y = -leftAngle * MAX_DOOR_SWING_RADIANS;
    }
    if (rightRef.current) {
      rightRef.current.rotation.y = rightAngle * MAX_DOOR_SWING_RADIANS;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[6.4, 6.2, 0.2]} />
        <meshLambertMaterial color="#2d2520" />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[6, 6, 0.1]} />
        <meshLambertMaterial color="#1a1510" />
      </mesh>

      {/* 左扇 */}
      <group ref={leftRef} position={[-3, 0, 0]}>
        <mesh position={[1.5, 0, 0.08]}>
          <boxGeometry args={[3, 6, 0.15]} />
          <meshLambertMaterial map={edgeTexture} />
        </mesh>
        <mesh position={[1.5, 0, 0.16]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={frontTexture} />
        </mesh>
        <mesh position={[1.5, 0, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={backTexture} />
        </mesh>
        {handleModelUrl ? (
          <DoorHandleModel
            position={[DOUBLE_HANDLE_X, DOUBLE_HANDLE_Y, DOUBLE_HANDLE_Z]}
            modelUrl={handleModelUrl}
            profileId={handleProfileId}
            pressAngle={handleAngle}
          />
        ) : (
          <mesh position={[DOUBLE_HANDLE_X, DOUBLE_HANDLE_Y, DOUBLE_HANDLE_Z]}>
            <sphereGeometry args={[0.08]} />
            <meshLambertMaterial color="#78643c" />
          </mesh>
        )}
      </group>

      {/* 右扇 */}
      <group ref={rightRef} position={[3, 0, 0]}>
        <mesh position={[-1.5, 0, 0.08]}>
          <boxGeometry args={[3, 6, 0.15]} />
          <meshLambertMaterial map={edgeTexture} />
        </mesh>
        <mesh position={[-1.5, 0, 0.16]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={frontTexture} />
        </mesh>
        <mesh position={[-1.5, 0, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={backTexture} />
        </mesh>
        {handleModelUrl ? (
          <DoorHandleModel
            position={[-DOUBLE_HANDLE_X, DOUBLE_HANDLE_Y, DOUBLE_HANDLE_Z]}
            modelUrl={handleModelUrl}
            profileId={handleProfileId}
            mirrorX
            pressAngle={-handleAngle}
          />
        ) : (
          <mesh position={[-DOUBLE_HANDLE_X, DOUBLE_HANDLE_Y, DOUBLE_HANDLE_Z]}>
            <sphereGeometry args={[0.08]} />
            <meshLambertMaterial color="#78643c" />
          </mesh>
        )}
      </group>
    </group>
  );
};

export const DoubleSwingRenderer: DoorAnimationRenderer = ({
  state,
  frontTextureUrl,
  edgeTextureUrl,
  backTextureUrl,
  handleModelUrl,
  handleProfileId,
}) => {
  return (
    <DoubleDoor
      leftAngle={state.doorAngle}
      rightAngle={state.rightDoorAngle ?? state.doorAngle}
      handleAngle={state.handleAngle ?? 0}
      frontTextureUrl={frontTextureUrl}
      edgeTextureUrl={edgeTextureUrl}
      backTextureUrl={backTextureUrl}
      handleModelUrl={handleModelUrl}
      handleProfileId={handleProfileId}
    />
  );
};
