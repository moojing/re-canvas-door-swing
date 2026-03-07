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

export const doubleSwingConfig: DoorAnimationConfig = {
  id: "double-swing",
  label: "Double Swing",
  description: "雙扇門同步向外開啟",
  duration: 5500,
  progressMarkers: [0, 0.2, 0.4, 0.6, 0.8, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    const swing = getDoorSwingWithBounce(progress, {
      start: 0.18,
      end: 0.68,
      bounce: 0.08,
      damping: 18,
      frequency: 32,
    });
    let left = swing;
    let right = swing;
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
    } else if (progress <= 0.68) {
      const doorProgress = (progress - 0.18) / 0.5;
      cameraDistance = 1 + doorProgress * 0.35;
    } else if (progress <= 0.9) {
      const forward = (progress - 0.68) / 0.22;
      cameraDistance = 1.35 + forward * 1.1;
    } else {
      const fadeProgress = (progress - 0.9) / 0.1;
      cameraDistance = 2.45;
      fadeOut = clamp(fadeProgress, 0, 1);
    }

    const cameraZ = 8 - (cameraDistance - 1) * 5.2;

    return {
      doorAngle: left,
      rightDoorAngle: right,
      handleAngle,
      cameraPosition: [0, 0, cameraZ],
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

const DoubleDoor = ({
  leftAngle,
  rightAngle,
  handleAngle,
  textureUrl,
  handleModelUrl,
}: {
  leftAngle: number;
  rightAngle: number;
  handleAngle: number;
  textureUrl: string;
  handleModelUrl?: string;
}) => {
  const leftRef = useRef<any>(null);
  const rightRef = useRef<any>(null);
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

      {/* 右扇 */}
      <group ref={rightRef} position={[3, 0, 0]}>
        <mesh position={[-1.5, 0, 0.08]}>
          <boxGeometry args={[3, 6, 0.15]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        <mesh position={[-1.5, 0, 0.16]}>
          <planeGeometry args={[3, 6]} />
          <meshLambertMaterial map={doorTexture} />
        </mesh>
        {handleModelUrl ? (
          <DoorHandleModel
            position={[-2.4, 0, 0.24]}
            modelUrl={handleModelUrl}
            mirrorX
            pressAngle={handleAngle}
          />
        ) : (
          <mesh position={[-2.4, 0, 0.24]}>
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
  textureUrl,
  handleModelUrl,
}) => {
  return (
    <DoubleDoor
      leftAngle={state.doorAngle}
      rightAngle={state.rightDoorAngle ?? state.doorAngle}
      handleAngle={state.handleAngle ?? 0}
      textureUrl={textureUrl}
      handleModelUrl={handleModelUrl}
    />
  );
};
