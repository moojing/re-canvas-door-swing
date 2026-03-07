import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  doorAnimationConfigs,
  getDoorAnimationConfig,
  easeInOutCubic,
  doorAnimationRenderers,
} from "./animations/index";
import { getDoorEntrancePreset } from "./presets";
import {
  DoorAnimationRenderer,
  DoorAnimationState,
  DoorEntrancePresetId,
  DoorAnimationVariant,
  DoorEntranceHandle,
} from "./types";

interface DoorEntranceProps {
  preset?: DoorEntrancePresetId;
  variant?: DoorAnimationVariant;
  autoPlay?: boolean;
  className?: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  textureUrl?: string;
  handleModelUrl?: string;
  cameraPanX?: number;
  cameraPanY?: number;
  onReady?: () => void;
}

const DEFAULT_CLASS_NAME =
  "h-[460px] w-full rounded-xl border border-white/10 bg-black";
const DEFAULT_TEXTURE_URL = "/textures/door-1.png";

const CameraController = ({
  cameraPosition,
  cameraTarget,
  fadeOut,
  cameraPanX,
  cameraPanY,
}: {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fadeOut: number;
  cameraPanX: number;
  cameraPanY: number;
}) => {
  const { camera } = useThree();
  const fadeRef = useRef<any>(null);

  useFrame(() => {
    const [x, y, z] = cameraPosition;
    camera.position.set(x + cameraPanX, y + cameraPanY, z);

    const [tx, ty, tz] = cameraTarget;
    camera.lookAt(tx + cameraPanX * 0.55, ty + cameraPanY * 0.55, tz);

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

const Scene = ({
  state,
  textureUrl,
  handleModelUrl,
  cameraPanX,
  cameraPanY,
  Renderer,
}: {
  state: DoorAnimationState;
  textureUrl: string;
  handleModelUrl?: string;
  cameraPanX: number;
  cameraPanY: number;
  Renderer: DoorAnimationRenderer;
}) => (
  <>
    <ambientLight intensity={0.2} />
    <directionalLight position={[2, 5, 5]} intensity={0.65} />
    <directionalLight position={[-3, 2, -4]} intensity={0.35} color="#8fa8c7" />
    <pointLight position={[0, 2, 3]} intensity={0.5} color="#ff8844" />
    <Renderer
      state={state}
      textureUrl={textureUrl}
      handleModelUrl={handleModelUrl}
    />
    <CameraController
      cameraPosition={state.cameraPosition}
      cameraTarget={state.cameraTarget}
      fadeOut={state.fadeOut}
      cameraPanX={cameraPanX}
      cameraPanY={cameraPanY}
    />
  </>
);

const DoorEntrance = forwardRef<DoorEntranceHandle, DoorEntranceProps>(
  (
    {
      preset = "door-single",
      variant,
      autoPlay = true,
      className,
      onComplete,
      onProgress,
      textureUrl,
      handleModelUrl,
      cameraPanX = 0,
      cameraPanY = 0,
      onReady,
    },
    ref
  ) => {
    const [activePreset, setActivePreset] = useState<DoorEntrancePresetId>(
      preset
    );
    useEffect(() => {
      setActivePreset(preset);
    }, [preset]);

    const selectedPreset = useMemo(
      () => getDoorEntrancePreset(activePreset),
      [activePreset]
    );
    const resolvedVariant = variant ?? selectedPreset.variant;
    const resolvedTextureUrl =
      textureUrl ?? selectedPreset.textureUrl ?? DEFAULT_TEXTURE_URL;
    const resolvedHandleModelUrl =
      handleModelUrl ?? selectedPreset.handleModelUrl;
    const resolvedClassName =
      className ?? selectedPreset.className ?? DEFAULT_CLASS_NAME;

    const selectedConfig = useMemo(
      () => getDoorAnimationConfig(resolvedVariant),
      [resolvedVariant]
    );
    const Renderer =
      doorAnimationRenderers[selectedConfig.id] ??
      ((({
        state: _state,
      }: {
        state: DoorAnimationState;
        textureUrl: string;
      }) => (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3, 6, 0.15]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
      )) as DoorAnimationRenderer);
    const [state, setState] = useState<DoorAnimationState>(
      selectedConfig.getState(0)
    );
    const animationFrameRef = useRef<number | null>(null);
    const isAnimatingRef = useRef(false);
    const progressRef = useRef(0);
    const onCompleteRef = useRef(onComplete);
    const onProgressRef = useRef(onProgress);
    const onReadyRef = useRef(onReady);

    useEffect(() => {
      onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
      onProgressRef.current = onProgress;
    }, [onProgress]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    const applyState = useCallback((nextState: DoorAnimationState) => {
      setState(nextState);
    }, []);

    const cancelAnimationLoop = useCallback(() => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }, []);

    const resolveConfig = useCallback(
      (nextPreset?: DoorEntrancePresetId) =>
        getDoorAnimationConfig(
          variant ?? getDoorEntrancePreset(nextPreset ?? activePreset).variant
        ),
      [activePreset, variant]
    );

    const applyProgress = useCallback(
      (linearProgress: number, config = selectedConfig) => {
        const clampedProgress = Math.min(Math.max(linearProgress, 0), 1);
        const easing = config.easing ?? easeInOutCubic;
        const easedProgress = easing(clampedProgress);

        progressRef.current = clampedProgress;
        applyState(
          config.getState(easedProgress, { linearProgress: clampedProgress })
        );
        onProgressRef.current?.(clampedProgress);
      },
      [applyState, selectedConfig]
    );

    const reset = useCallback((nextPreset?: DoorEntrancePresetId) => {
      cancelAnimationLoop();
      isAnimatingRef.current = false;

      const presetToReset = nextPreset ?? activePreset;
      if (nextPreset && nextPreset !== activePreset) {
        setActivePreset(nextPreset);
      }
      applyProgress(0, resolveConfig(presetToReset));
    }, [activePreset, applyProgress, cancelAnimationLoop, resolveConfig]);

    const seek = useCallback((progress: number, nextPreset?: DoorEntrancePresetId) => {
      cancelAnimationLoop();
      isAnimatingRef.current = false;

      const presetToSeek = nextPreset ?? activePreset;
      if (nextPreset && nextPreset !== activePreset) {
        setActivePreset(nextPreset);
      }
      applyProgress(progress, resolveConfig(presetToSeek));
    }, [activePreset, applyProgress, cancelAnimationLoop, resolveConfig]);

    const stop = useCallback(() => {
      cancelAnimationLoop();
      isAnimatingRef.current = false;
    }, [cancelAnimationLoop]);

    const play = useCallback((nextPreset?: DoorEntrancePresetId) => {
      if (isAnimatingRef.current) return;

      const presetToPlay = nextPreset ?? activePreset;
      if (nextPreset && nextPreset !== activePreset) {
        setActivePreset(nextPreset);
      }
      const config = resolveConfig(presetToPlay);

      const startLinearProgress =
        progressRef.current >= 1 ? 0 : progressRef.current;
      if (startLinearProgress !== progressRef.current) {
        applyProgress(startLinearProgress, config);
      }

      const duration = Math.max(
        config.duration * (1 - startLinearProgress),
        1
      );
      isAnimatingRef.current = true;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        if (!isAnimatingRef.current) {
          animationFrameRef.current = null;
          return;
        }

        const elapsed = currentTime - startTime;
        const linearProgress = Math.min(
          startLinearProgress + (elapsed / duration) * (1 - startLinearProgress),
          1
        );
        applyProgress(linearProgress, config);

        if (linearProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
          animationFrameRef.current = null;
          onCompleteRef.current?.();
        }
      };

      cancelAnimationLoop();
      animationFrameRef.current = requestAnimationFrame(animate);
    }, [
      activePreset,
      applyProgress,
      cancelAnimationLoop,
      resolveConfig,
    ]);

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
        stop,
        reset,
        seek,
      }),
      [play, stop, reset, seek]
    );

    useEffect(() => {
      onReadyRef.current?.();
    }, []);

    return (
      <div className={`relative overflow-hidden ${resolvedClassName}`}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          onCreated={({ gl }) => {
            gl.setClearColor("#000000");
          }}
        >
          <Scene
            state={state}
            textureUrl={resolvedTextureUrl}
            handleModelUrl={resolvedHandleModelUrl}
            cameraPanX={cameraPanX}
            cameraPanY={cameraPanY}
            Renderer={Renderer}
          />
        </Canvas>

        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.08em] text-white/70 backdrop-blur">
          {doorAnimationConfigs.find((c) => c.id === resolvedVariant)?.label ??
            "Door"}
        </div>
      </div>
    );
  }
);

DoorEntrance.displayName = "DoorEntrance";

export default DoorEntrance;
export type { DoorEntranceProps };
