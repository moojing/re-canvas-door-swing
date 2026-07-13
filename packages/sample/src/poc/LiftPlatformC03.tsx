/**
 * PoC: 1-1 c03 升降平台 (Biohazard)
 *
 * 驗證目標: 不依賴現成模型，以 primitive 建出平台、欄杆、網面與控制盒，
 * 再用本機遊戲影格裁切貼圖比對視覺相似度。貼圖目錄已 gitignore，正式版不可沿用。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { C03_DURATION_MS, getC03MotionState } from "./c03Motion";

const TEX_BASE = `${import.meta.env.BASE_URL}textures/poc-c03`;
const RUST = "#3a0d09";
const RUST_DARK = "#180605";

const useOptionalTexture = (file: string) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    const loaded = new THREE.TextureLoader().load(
      `${TEX_BASE}/${file}?v=20260713`,
      () => {
        if (!active) return;
        loaded.encoding = THREE.sRGBEncoding;
        loaded.magFilter = THREE.NearestFilter;
        loaded.minFilter = THREE.NearestFilter;
        loaded.needsUpdate = true;
        setTexture(loaded);
      },
      undefined,
      () => loaded.dispose()
    );

    return () => {
      active = false;
      loaded.dispose();
    };
  }, [file]);

  return texture;
};

type Position = [number, number, number];

const TexturedBox = ({
  size,
  position,
  texture,
  color = RUST,
}: {
  size: Position;
  position: Position;
  texture: THREE.Texture | null;
  color?: string;
}) => (
  <mesh position={position}>
    <boxGeometry args={size} />
    <meshLambertMaterial map={texture ?? undefined} color={texture ? "#ffffff" : color} />
  </mesh>
);

const TexturedTopBox = ({
  size,
  position,
  texture,
}: {
  size: Position;
  position: Position;
  texture: THREE.Texture | null;
}) => (
  <group position={position}>
    <mesh>
      <boxGeometry args={size} />
      <meshLambertMaterial color={RUST_DARK} />
    </mesh>
    <mesh position={[0, size[1] / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size[0], size[2]]} />
      <meshLambertMaterial map={texture ?? undefined} color={texture ? "#ffffff" : RUST} />
    </mesh>
  </group>
);

const RailingBeam = ({
  from,
  to,
  texture,
}: {
  from: Position;
  to: Position;
  texture: THREE.Texture | null;
}) => {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);
  const midpoint: Position = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];

  return (
    <mesh position={midpoint} rotation={[0, -Math.atan2(dz, dx), 0]}>
      <boxGeometry args={[length, 0.17, 0.17]} />
      <meshLambertMaterial map={texture ?? undefined} color={texture ? "#ffffff" : RUST} />
    </mesh>
  );
};

const RailingPost = ({ position, texture }: { position: Position; texture: THREE.Texture | null }) => (
  <TexturedBox size={[0.18, 1.85, 0.18]} position={position} texture={texture} />
);

const Controller = ({ texture }: { texture: THREE.Texture | null }) => (
  <group position={[-3.02, 2.02, -0.48]} rotation={[0, 0.18, -0.08]}>
    <mesh>
      <boxGeometry args={[0.62, 1.05, 0.2]} />
      <meshLambertMaterial color="#735122" />
    </mesh>
    <mesh position={[0, 0, 0.106]}>
      <planeGeometry args={[0.58, 0.98]} />
      <meshBasicMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#a78336"} />
    </mesh>
    {[
      { id: "up", y: 0.33, color: "#64d85c", segments: 3, rotation: 0 },
      { id: "red-top", y: 0.1, color: "#a81f18", segments: 12, rotation: 0 },
      { id: "red-bottom", y: -0.13, color: "#a81f18", segments: 12, rotation: 0 },
      { id: "down", y: -0.36, color: "#64d85c", segments: 3, rotation: Math.PI },
    ].map((indicator) => (
      <mesh
        key={indicator.id}
        position={[0, indicator.y, 0.14]}
        rotation={[Math.PI / 2, 0, indicator.rotation]}
      >
        <cylinderGeometry args={[0.078, 0.078, 0.045, indicator.segments]} />
        <meshBasicMaterial color={indicator.color} />
      </mesh>
    ))}
  </group>
);

const LiftPlatform = () => {
  const rust = useOptionalTexture("rust.png");
  const grid = useOptionalTexture("grid.png");
  const plateLeft = useOptionalTexture("plate-left.png");
  const plateRight = useOptionalTexture("plate-right.png");
  const controller = useOptionalTexture("controller.png");

  const railY = 1.72;
  const railPoints: Position[] = [
    [-2.42, railY, -1.92],
    [2.68, railY, -1.92],
    [2.68, railY, 1.5],
  ];
  const bentRailPoints: Position[] = [
    [-2.42, railY, -1.92],
    [-2.78, railY, -1.55],
    [-2.98, railY, -0.95],
    [-2.98, railY, -0.3],
  ];

  return (
    <group rotation={[0, -0.08, 0]}>
      <TexturedBox size={[5.8, 0.3, 0.34]} position={[0, 0, -2.18]} texture={rust} />
      <TexturedBox size={[5.8, 0.3, 0.34]} position={[0, 0, 2.18]} texture={rust} />
      <TexturedBox size={[0.34, 0.3, 4.1]} position={[-2.73, 0, 0]} texture={rust} />
      <TexturedBox size={[0.34, 0.3, 4.1]} position={[2.73, 0, 0]} texture={rust} />

      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.35, 4.0]} />
        <meshLambertMaterial
          map={grid ?? undefined}
          color={grid ? "#ffffff" : "#26312f"}
          transparent={Boolean(grid)}
          alphaTest={grid ? 0.2 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 22s close frame crops: left 260:180:350:100, right 360:170:625:180. */}
      <TexturedTopBox size={[1.45, 0.22, 1.15]} position={[-1.72, 0.28, -1.3]} texture={plateLeft} />
      <TexturedTopBox size={[2.45, 0.22, 1.08]} position={[0.72, 0.28, -1.34]} texture={plateRight} />

      {railPoints.slice(0, -1).map((point, index) => (
        <RailingBeam key={`rail-${index}`} from={point} to={railPoints[index + 1]} texture={rust} />
      ))}
      {bentRailPoints.slice(0, -1).map((point, index) => (
        <RailingBeam
          key={`bent-${index}`}
          from={point}
          to={bentRailPoints[index + 1]}
          texture={rust}
        />
      ))}
      <RailingPost position={[-2.42, 0.86, -1.92]} texture={rust} />
      <RailingPost position={[2.68, 0.86, -1.92]} texture={rust} />
      <RailingPost position={[2.68, 0.86, 1.5]} texture={rust} />
      <RailingPost position={[-2.98, 0.86, -0.3]} texture={rust} />
      <Controller texture={controller} />
    </group>
  );
};

const CameraRig = ({ progress }: { progress: number }) => {
  const state = getC03MotionState(progress);

  useFrame(({ camera }) => {
    camera.position.set(...state.cameraPosition);
    camera.lookAt(...state.cameraTarget);
  });

  return null;
};

const LiftPlatformC03 = () => {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  const stopPlayback = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    stopPlayback();
    const startTime = performance.now() - progress * C03_DURATION_MS;

    const tick = (now: number) => {
      const nextProgress = Math.min((now - startTime) / C03_DURATION_MS, 1);
      setProgress(nextProgress);
      if (nextProgress < 1) frameRef.current = requestAnimationFrame(tick);
      else frameRef.current = null;
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [progress, stopPlayback]);

  useEffect(() => stopPlayback, [stopPlayback]);

  return (
    <div className="min-h-screen bg-black px-4 py-5 text-white sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80">
            Feasibility POC · Biohazard 1-1 c03
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">升降平台：primitive 幾何 + 本機參考貼圖</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-white/60">
            驗證平台厚框、alpha 網面、踏板、彎折欄杆與控制盒能否在黑背景中成立。
            遊戲影格裁切只存在本機 gitignored 目錄；缺少貼圖時會顯示純色 fallback。
          </p>
        </div>

        <div className="h-[62vh] min-h-[360px] max-h-[620px] w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-red-950/20">
          <Canvas
            camera={{ position: [-5.8, 6.8, 10.5], fov: 48, near: 0.1, far: 100 }}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <ambientLight intensity={0.08} />
            <directionalLight position={[2, 7, 5]} intensity={0.24} color="#ffb07c" />
            <directionalLight position={[-5, 4, -3]} intensity={0.12} color="#62859c" />
            <pointLight position={[-2.5, 3, 1]} intensity={0.12} color="#c8381f" />
            <LiftPlatform />
            <CameraRig progress={progress} />
          </Canvas>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <button
            onClick={play}
            className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-200"
          >
            播放
          </button>
          <button
            onClick={() => {
              stopPlayback();
              setProgress(0);
            }}
            className="rounded-lg border border-white/25 px-4 py-2 text-sm hover:bg-white/10"
          >
            重置
          </button>
          <input
            aria-label="動畫進度"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={(event) => {
              stopPlayback();
              setProgress(Number(event.target.value));
            }}
            className="min-w-44 flex-1 accent-amber-300"
          />
          <span className="w-12 text-right text-xs tabular-nums text-white/60">
            {(progress * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiftPlatformC03;
