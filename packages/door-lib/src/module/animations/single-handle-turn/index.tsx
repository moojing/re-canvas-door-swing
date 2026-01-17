import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import {
  DoorAnimationConfig,
  DoorAnimationRenderer,
} from "../../types";
import { clamp, easeInOutCubic } from "../shared";

export const singleHandleTurnConfig: DoorAnimationConfig = {
  id: "single-handle-turn",
  label: "Handle Turn Entry",
  description: "先轉動門把再開啟單門",
  duration: 5500,
  progressMarkers: [0, 0.2, 0.35, 0.6, 0.85, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    let doorAngle = 0;
    let handleAngle = 0;
    let cameraDistance = 1;
    let fadeOut = 0;

    if (progress <= 0.2) {
      // 先轉門把
      handleAngle = easeInOutCubic(progress / 0.2);
      doorAngle = 0;
    } else if (progress <= 0.6) {
      // 開門
      const t = (progress - 0.2) / 0.4;
      doorAngle = easeInOutCubic(t);
      handleAngle = 1;
      cameraDistance = 1 + t * 0.3;
    } else if (progress <= 0.9) {
      // 向前推進
      const t = (progress - 0.6) / 0.3;
      doorAngle = 1;
      handleAngle = 1;
      cameraDistance = 1.3 + t * 1.1;
    } else {
      // 淡出
      const t = (progress - 0.9) / 0.1;
      doorAngle = 1;
      handleAngle = 1;
      cameraDistance = 2.4;
      fadeOut = clamp(t, 0, 1);
    }

    const cameraZ = 8 - (cameraDistance - 1) * 5.1;

    return {
      doorAngle,
      handleAngle,
      cameraPosition: [0, 0, cameraZ],
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

const SingleDoorWithHandle = ({
  doorAngle,
  handleAngle,
  textureUrl,
}: {
  doorAngle: number;
  handleAngle: number;
  textureUrl: string;
}) => {
  const doorGroupRef = useRef<any>(null);
  const handleRef = useRef<any>(null);
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
      doorGroupRef.current.rotation.y = -doorAngle * Math.PI * 0.5;
    }
    if (handleRef.current) {
      // 讓門把繞著自身 Z 軸轉動
      handleRef.current.rotation.z = handleAngle * Math.PI * 0.35;
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

        {/* 門把（附旋轉） */}
        <group ref={handleRef} position={[2.4, 0, 0.2]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
            <meshLambertMaterial color="#78643c" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const SingleHandleTurnRenderer: DoorAnimationRenderer = ({
  state,
  textureUrl,
}) => (
  <SingleDoorWithHandle
    doorAngle={state.doorAngle}
    handleAngle={state.handleAngle ?? 0}
    textureUrl={textureUrl}
  />
);
