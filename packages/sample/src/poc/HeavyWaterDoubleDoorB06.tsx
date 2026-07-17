import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { resolveB06FrontUrl, type B06Variant } from "./b06Assets";
import { startB06FrontLoad } from "./b06FrontLoader";
import {
  buildB06FrontResourcesFromImage,
  type B06FrontResources,
} from "./b06FrontResources";
import {
  createB06SceneDescriptor,
  type B06FrontDescriptor,
  type B06LeafDescriptor,
} from "./b06Scene";
import {
  B06_CAMERA_START_Z,
  B06_DURATION_MS,
  getB06MotionState,
} from "./b06Motion";

type FrontResources = B06FrontResources<
  THREE.CanvasTexture,
  THREE.MeshBasicMaterial
>;

type LoadedFront = Readonly<{
  variant: B06Variant;
  resources: FrontResources;
}>;

const FrontPlane = ({
  front,
}: {
  front: B06FrontDescriptor<THREE.MeshBasicMaterial>;
}) => (
  <mesh position={[...front.position]} material={front.material}>
    <planeGeometry args={[...front.size]} />
  </mesh>
);

const ValveHardware = ({
  leaf,
  wheelRef,
}: {
  leaf: B06LeafDescriptor<THREE.MeshBasicMaterial>;
  wheelRef: React.RefObject<THREE.Group>;
}) => {
  if (!leaf.wheel || !leaf.wheelBacking) return null;

  const backingPosition = leaf.wheelBacking.position;
  const wheelPosition: [number, number, number] = [
    leaf.wheel.position[0],
    leaf.wheel.position[1],
    leaf.wheel.position[2] + 0.1,
  ];

  return (
    <>
      <mesh position={[...backingPosition]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[
            leaf.wheelBacking.radius,
            leaf.wheelBacking.radius,
            leaf.wheelBacking.depth,
            32,
          ]}
        />
        <meshStandardMaterial color="#2c2928" metalness={0.72} roughness={0.82} />
      </mesh>
      <group ref={wheelRef} position={wheelPosition}>
        <mesh>
          <torusGeometry args={[leaf.wheel.radius * 0.78, 0.075, 8, 32]} />
          <meshStandardMaterial color="#57443c" metalness={0.74} roughness={0.78} />
        </mesh>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]} position={[
            Math.cos(angle) * leaf.wheel.radius * 0.38,
            Math.sin(angle) * leaf.wheel.radius * 0.38,
            0,
          ]}>
            <boxGeometry args={[leaf.wheel.radius * 0.64, 0.07, 0.08]} />
            <meshStandardMaterial color="#655048" metalness={0.7} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.1, 20]} />
          <meshStandardMaterial color="#342b28" metalness={0.76} roughness={0.72} />
        </mesh>
      </group>
    </>
  );
};

const PullHandle = ({
  leaf,
}: {
  leaf: B06LeafDescriptor<THREE.MeshBasicMaterial>;
}) => {
  if (!leaf.handle) return null;

  return (
    <group>
      <mesh position={[...leaf.handle.center]}>
        <boxGeometry args={[...leaf.handle.barSize]} />
        <meshStandardMaterial color="#4e4743" metalness={0.72} roughness={0.8} />
      </mesh>
      {leaf.handle.mounts.map((mount, index) => (
        <mesh key={index} position={[...mount.position]}>
          <boxGeometry args={[...mount.size]} />
          <meshStandardMaterial color="#302c2a" metalness={0.75} roughness={0.78} />
        </mesh>
      ))}
    </group>
  );
};

const DoorLeaf = ({
  leaf,
  hingeRef,
  wheelRef,
}: {
  leaf: B06LeafDescriptor<THREE.MeshBasicMaterial>;
  hingeRef: React.RefObject<THREE.Group>;
  wheelRef: React.RefObject<THREE.Group>;
}) => (
  <group ref={hingeRef} position={[leaf.hingeX, 0, 0]} scale={[...leaf.scale]}>
    <mesh position={[...leaf.box.position]}>
      <boxGeometry args={[...leaf.box.size]} />
      <meshStandardMaterial color="#342a27" metalness={0.62} roughness={0.9} />
    </mesh>
    {leaf.front && <FrontPlane front={leaf.front} />}
    <ValveHardware leaf={leaf} wheelRef={wheelRef} />
    <PullHandle leaf={leaf} />
  </group>
);

const HeavyWaterDoubleDoor = ({
  progress,
  variant,
}: {
  progress: number;
  variant: B06Variant;
}) => {
  const [loadedFront, setLoadedFront] = useState<LoadedFront | null>(null);
  const leftHingeRef = useRef<THREE.Group>(null);
  const rightHingeRef = useRef<THREE.Group>(null);
  const wheelRef = useRef<THREE.Group>(null);
  const motion = getB06MotionState(progress);

  useEffect(() => {
    let publishedResources: FrontResources | null = null;
    const cleanup = startB06FrontLoad({
      url: resolveB06FrontUrl(import.meta.env.BASE_URL, variant),
      createImage: () => new Image(),
      createResources: buildB06FrontResourcesFromImage,
      publish: (resources) => {
        publishedResources = resources;
        setLoadedFront({ variant, resources });
      },
      onFailure: (error) => {
        console.warn(
          `B06 ${variant} front unavailable; dark-metal fallback is active.`,
          error,
        );
      },
    });

    return () => {
      cleanup();
      setLoadedFront((current) =>
        current?.resources === publishedResources ? null : current,
      );
    };
  }, [variant]);

  useFrame(() => {
    if (leftHingeRef.current) leftHingeRef.current.rotation.y = motion.leftAngle;
    if (rightHingeRef.current) rightHingeRef.current.rotation.y = motion.rightAngle;
    if (wheelRef.current) wheelRef.current.rotation.z = motion.wheelAngle;
  });

  const activeResources = loadedFront?.variant === variant
    ? loadedFront.resources
    : null;
  const scene = createB06SceneDescriptor(activeResources);

  return (
    <group>
      <DoorLeaf
        leaf={scene.leaves[0]}
        hingeRef={leftHingeRef}
        wheelRef={wheelRef}
      />
      <DoorLeaf
        leaf={scene.leaves[1]}
        hingeRef={rightHingeRef}
        wheelRef={wheelRef}
      />
    </group>
  );
};

const CameraRig = ({ progress }: { progress: number }) => {
  const motion = getB06MotionState(progress);
  useFrame(({ camera }) => {
    camera.position.set(...motion.cameraPosition);
    camera.lookAt(...motion.cameraTarget);
  });
  return null;
};

const FadePlane = ({ opacity }: { opacity: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const directionRef = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    camera.getWorldDirection(directionRef.current);
    meshRef.current.position.copy(camera.position).addScaledVector(directionRef.current, 0.5);
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={meshRef} renderOrder={1000} frustumCulled={false}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const variants: readonly B06Variant[] = ["normal", "frozen"];

const HeavyWaterDoubleDoorB06 = () => {
  const [progress, setProgress] = useState(0);
  const [variant, setVariant] = useState<B06Variant>("normal");
  const frameRef = useRef<number | null>(null);
  const motion = getB06MotionState(progress);

  const stopPlayback = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    stopPlayback();
    const startProgress = progress >= 1 ? 0 : progress;
    const startTime = performance.now() - startProgress * B06_DURATION_MS;
    setProgress(startProgress);

    const tick = (now: number) => {
      const nextProgress = Math.min((now - startTime) / B06_DURATION_MS, 1);
      setProgress(nextProgress);
      if (nextProgress < 1) frameRef.current = requestAnimationFrame(tick);
      else frameRef.current = null;
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [progress, stopPlayback]);

  useEffect(() => stopPlayback, [stopPlayback]);

  return (
    <main className="min-h-screen bg-[#050404] px-4 py-5 text-stone-100 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/75">
            Feasibility POC · Biohazard 1-2 b06
          </p>
          <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Heavy water double-door material reuse
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-stone-400">
            驗證 A11 重型門板能否延伸為雙扇鉸鏈，並讓一般金屬與冰霜版共用同一套幾何與動畫。
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-stone-800 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="h-[min(62vh,590px)] min-h-[430px] w-full">
            <Canvas
              camera={{ position: [0, 0, B06_CAMERA_START_Z], fov: 52 }}
              onCreated={({ gl }) => gl.setClearColor("#000000")}
            >
              <ambientLight intensity={0.38} />
              <directionalLight position={[3, 5, 5]} intensity={0.72} color="#f2dfcf" />
              <directionalLight position={[-4, 1, 2]} intensity={0.28} color="#9ba9b3" />
              <pointLight position={[0, 2.5, 3.5]} intensity={0.25} color="#d6a477" />
              <HeavyWaterDoubleDoor progress={progress} variant={variant} />
              <CameraRig progress={progress} />
              <FadePlane opacity={motion.fadeOut} />
            </Canvas>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-stone-800 bg-[#100d0c] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={play}
              className="rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-100"
            >
              播放
            </button>
            <button
              type="button"
              onClick={() => {
                stopPlayback();
                setProgress(0);
              }}
              className="rounded-lg border border-stone-600 px-4 py-2 text-sm transition hover:border-stone-400 hover:bg-stone-800"
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
              className="w-48 accent-amber-300 sm:w-64"
            />
            <span className="min-w-10 text-right text-xs tabular-nums text-stone-500">
              {(progress * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex rounded-xl border border-stone-700 bg-black p-1" aria-label="門板材質">
            {variants.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={variant === option}
                onClick={() => setVariant(option)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  variant === option
                    ? "bg-stone-200 text-stone-950"
                    : "text-stone-500 hover:text-stone-200"
                }`}
              >
                {option === "normal" ? "Normal" : "Frozen"}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default HeavyWaterDoubleDoorB06;
