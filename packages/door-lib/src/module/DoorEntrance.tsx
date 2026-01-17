import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  doorAnimationConfigs,
  getDoorAnimationConfig,
  easeInOutCubic,
} from "./animations";
import {
  DoorAnimationState,
  DoorAnimationVariant,
  DoorEntranceHandle,
} from "./types";

interface DoorEntranceProps {
  variant?: DoorAnimationVariant;
  autoPlay?: boolean;
  className?: string;
  onComplete?: () => void;
  textureUrl?: string;
}

const Door = ({ doorAngle, textureUrl }: { doorAngle: number; textureUrl: string }) => {
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

const CameraController = ({
  cameraPosition,
  cameraTarget,
  fadeOut,
}: {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fadeOut: number;
}) => {
  const { camera } = useThree();
  const fadeRef = useRef<any>(null);

  useFrame(() => {
    const [x, y, z] = cameraPosition;
    camera.position.set(x, y, z);

    const [tx, ty, tz] = cameraTarget;
    camera.lookAt(tx, ty, tz);

    if (fadeRef.current) {
      const material = fadeRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = fadeOut;
    }
  });

  return (
    <mesh ref={fadeRef} position={[0, 0, 5]}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial color="#000000" transparent opacity={0} />
    </mesh>
  );
};

const Scene = ({ state, textureUrl }: { state: DoorAnimationState; textureUrl: string }) => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 5, 5]} intensity={0.8} />
      <pointLight position={[0, 2, 3]} intensity={0.5} color="#ff8844" />
      <Door doorAngle={state.doorAngle} textureUrl={textureUrl} />
      <CameraController
        cameraPosition={state.cameraPosition}
        cameraTarget={state.cameraTarget}
        fadeOut={state.fadeOut}
      />
    </>
  );
};

const DoorEntrance = forwardRef<DoorEntranceHandle, DoorEntranceProps>(
  (
    {
      variant = "direct-entry",
      autoPlay = true,
      className = "h-[460px] w-full rounded-xl border border-white/10 bg-black",
      onComplete,
      textureUrl = "/textures/door-1.png",
    },
    ref
  ) => {
    const selectedConfig = useMemo(
      () => getDoorAnimationConfig(variant),
      [variant]
    );
    const [state, setState] = useState<DoorAnimationState>(
      selectedConfig.getState(0)
    );
    const animationFrameRef = useRef<number | null>(null);
    const isAnimatingRef = useRef(false);

    const applyState = useCallback((nextState: DoorAnimationState) => {
      setState(nextState);
    }, []);

    const cancelAnimationLoop = useCallback(() => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }, []);

    const reset = useCallback(() => {
      cancelAnimationLoop();
      isAnimatingRef.current = false;
      applyState(selectedConfig.getState(0));
    }, [applyState, cancelAnimationLoop, selectedConfig]);

    const play = useCallback(() => {
      if (isAnimatingRef.current) return;

      const config = selectedConfig;
      const duration = config.duration;
      const easing = config.easing ?? easeInOutCubic;

      isAnimatingRef.current = true;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const linearProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(linearProgress);
        applyState(config.getState(easedProgress));

        if (linearProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
          animationFrameRef.current = null;
          onComplete?.();
        }
      };

      cancelAnimationLoop();
      animationFrameRef.current = requestAnimationFrame(animate);
    }, [applyState, cancelAnimationLoop, onComplete, selectedConfig]);

    useEffect(() => {
      reset();
      if (autoPlay) {
        play();
      }
      return () => cancelAnimationLoop();
    }, [autoPlay, play, reset, cancelAnimationLoop, selectedConfig.id]);

    useImperativeHandle(
      ref,
      () => ({
        play,
        reset,
      }),
      [play, reset]
    );

    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          onCreated={({ gl }) => {
            gl.setClearColor("#000000");
          }}
        >
          <Scene state={state} textureUrl={textureUrl} />
        </Canvas>

        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.08em] text-white/70 backdrop-blur">
          {doorAnimationConfigs.find((c) => c.id === variant)?.label ?? "Door"}
        </div>
      </div>
    );
  }
);

DoorEntrance.displayName = "DoorEntrance";

export default DoorEntrance;
export type { DoorEntranceProps };
