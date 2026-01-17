import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import {
  DoorAnimationConfig,
  DoorAnimationRenderer,
} from "../../types";
import { clamp, easeInOutCubic, lerp } from "../shared";

export const topDownConfig: DoorAnimationConfig = {
  id: "top-down-entry",
  label: "Overhead Entry",
  description: "俯視下降後靠近門再淡出",
  duration: 6500,
  progressMarkers: [0, 0.2, 0.35, 0.6, 0.85, 1],
  easing: easeInOutCubic,
  getState: (rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    let doorAngle = 0;
    let fadeOut = 0;

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
    } else if (progress <= 0.6) {
      const t = (progress - 0.35) / 0.25;
      cameraPosition = lerp(midHoverPosition, frontPrepPosition, t);
      doorAngle = 0;
    } else if (progress <= 0.85) {
      const t = (progress - 0.6) / 0.25;
      const easedDoor = easeInOutCubic(t);
      doorAngle = easedDoor;
      cameraPosition = lerp(frontPrepPosition, closeApproachPosition, t);
    } else {
      const t = (progress - 0.85) / 0.15;
      doorAngle = 1;
      cameraPosition = lerp(closeApproachPosition, finalFadePosition, t);
      fadeOut = clamp(t, 0, 1);
    }

    return {
      doorAngle,
      cameraPosition,
      cameraTarget: [0, 0, 0],
      fadeOut,
    };
  },
};

const SingleDoor = ({
  doorAngle,
  textureUrl,
}: {
  doorAngle: number;
  textureUrl: string;
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
      doorGroupRef.current.rotation.y = -doorAngle * Math.PI * 0.5;
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

        <mesh position={[2.4, 0, 0.2]}>
          <sphereGeometry args={[0.08]} />
          <meshLambertMaterial color="#78643c" />
        </mesh>
      </group>
    </group>
  );
};

export const TopDownEntryRenderer: DoorAnimationRenderer = ({
  state,
  textureUrl,
}) => {
  return <SingleDoor doorAngle={state.doorAngle} textureUrl={textureUrl} />;
};
