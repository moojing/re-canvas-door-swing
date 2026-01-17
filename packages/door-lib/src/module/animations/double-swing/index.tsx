import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import {
  DoorAnimationConfig,
  DoorAnimationRenderer,
} from "../../types";
import { clamp, easeInOutCubic } from "../shared";

export const doubleSwingConfig: DoorAnimationConfig = {
  id: "double-swing",
  label: "Double Swing",
  description: "雙扇門同步向外開啟",
  duration: 5500,
  progressMarkers: [0, 0.2, 0.4, 0.6, 0.8, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    let left = 0;
    let right = 0;
    let cameraDistance = 1;
    let fadeOut = 0;

    if (progress <= 0.65) {
      const doorProgress = progress / 0.65;
      left = doorProgress;
      right = doorProgress;
      cameraDistance = 1 + doorProgress * 0.35;
    } else if (progress <= 0.9) {
      const forward = (progress - 0.65) / 0.25;
      left = 1;
      right = 1;
      cameraDistance = 1.35 + forward * 1.1;
    } else {
      const fadeProgress = (progress - 0.9) / 0.1;
      left = 1;
      right = 1;
      cameraDistance = 2.45;
      fadeOut = clamp(fadeProgress, 0, 1);
    }

    const cameraZ = 8 - (cameraDistance - 1) * 5.2;

    return {
      doorAngle: left,
      rightDoorAngle: right,
      cameraPosition: [0, 0, cameraZ],
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

const DoubleDoor = ({
  leftAngle,
  rightAngle,
  textureUrl,
}: {
  leftAngle: number;
  rightAngle: number;
  textureUrl: string;
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
      leftRef.current.rotation.y = -leftAngle * Math.PI * 0.5;
    }
    if (rightRef.current) {
      rightRef.current.rotation.y = rightAngle * Math.PI * 0.5;
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

      {/* 左扇 */}
      <group ref={leftRef} position={[-1.5, 0, 0]}>
        <mesh position={[0.75, 0, 0.08]}>
          <boxGeometry args={[1.5, 6, 0.15]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0.75, 0, 0.16]}>
          <planeGeometry args={[1.5, 6]} />
          <meshLambertMaterial map={doorTexture} />
        </mesh>
        <mesh position={[1.2, 0, 0.2]}>
          <sphereGeometry args={[0.08]} />
          <meshLambertMaterial color="#78643c" />
        </mesh>
      </group>

      {/* 右扇 */}
      <group ref={rightRef} position={[1.5, 0, 0]}>
        <mesh position={[-0.75, 0, 0.08]}>
          <boxGeometry args={[1.5, 6, 0.15]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        <mesh position={[-0.75, 0, 0.16]}>
          <planeGeometry args={[1.5, 6]} />
          <meshLambertMaterial map={doorTexture} />
        </mesh>
        <mesh position={[-1.2, 0, 0.2]}>
          <sphereGeometry args={[0.08]} />
          <meshLambertMaterial color="#78643c" />
        </mesh>
      </group>
    </group>
  );
};

export const DoubleSwingRenderer: DoorAnimationRenderer = ({
  state,
  textureUrl,
}) => {
  return (
    <DoubleDoor
      leftAngle={state.doorAngle}
      rightAngle={state.rightDoorAngle ?? state.doorAngle}
      textureUrl={textureUrl}
    />
  );
};
