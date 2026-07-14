import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  B05_BAR_RADIUS,
  B05_LEAF_WIDTH,
  createB05GateGeometry,
  createB05LeafGeometry,
  type B05BoxMember,
} from "./b05Geometry";
import { B05_DURATION_MS, getB05MotionState } from "./b05Motion";
import { createAgedIronPixels } from "./b05ProceduralMaterials";

const TEXTURE_SIZE = 128;
const TEXTURE_SEED = 51;
const LEAF_GEOMETRY = createB05LeafGeometry();
const GATE_GEOMETRY = createB05GateGeometry();
const ARCH_CURVE = new THREE.CatmullRomCurve3(
  LEAF_GEOMETRY.archPath.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
);

const createAgedIronTexture = () => {
  const pixels = createAgedIronPixels(TEXTURE_SIZE, TEXTURE_SIZE, TEXTURE_SEED);
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create the B05 procedural texture canvas");
  }

  const imageData = new ImageData(pixels, TEXTURE_SIZE, TEXTURE_SIZE);
  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
};

const IronBox = ({
  member,
  texture,
  color = "#ffffff",
}: {
  member: B05BoxMember;
  texture: THREE.Texture;
  color?: string;
}) => (
  <mesh position={[...member.position]}>
    <boxGeometry args={[...member.size]} />
    <meshStandardMaterial
      map={texture}
      color={color}
      metalness={0.74}
      roughness={0.68}
    />
  </mesh>
);

const CanonicalArchedLeaf = ({ texture }: { texture: THREE.Texture }) => (
  <group>
    <IronBox member={LEAF_GEOMETRY.lowerPanel} texture={texture} color="#a68d78" />
    <IronBox member={LEAF_GEOMETRY.divider} texture={texture} color="#cab69b" />

    {LEAF_GEOMETRY.bars.map((bar, index) => (
      <IronBox
        key={`bar-${index}`}
        member={bar}
        texture={texture}
        color={index % 2 === 0 ? "#a9947f" : "#887767"}
      />
    ))}

    <mesh>
      <tubeGeometry args={[ARCH_CURVE, 64, B05_BAR_RADIUS * 1.35, 8, false]} />
      <meshStandardMaterial
        map={texture}
        color="#b49d83"
        metalness={0.78}
        roughness={0.62}
      />
    </mesh>

    {LEAF_GEOMETRY.reliefBlocks.map((block, index) => (
      <IronBox
        key={`relief-${index}`}
        member={block}
        texture={texture}
        color={["#d0a36f", "#8e735c", "#b9865d"][index]}
      />
    ))}
  </group>
);

const GateFrame = () => (
  <group>
    <mesh position={[-B05_LEAF_WIDTH - 0.18, 2.45, -0.08]}>
      <boxGeometry args={[0.3, 5.35, 0.42]} />
      <meshStandardMaterial color="#181411" metalness={0.55} roughness={0.9} />
    </mesh>
    <mesh position={[B05_LEAF_WIDTH + 0.18, 2.45, -0.08]}>
      <boxGeometry args={[0.3, 5.35, 0.42]} />
      <meshStandardMaterial color="#181411" metalness={0.55} roughness={0.9} />
    </mesh>
    <mesh position={[0, -0.12, 0]}>
      <boxGeometry args={[6.4, 0.24, 0.65]} />
      <meshStandardMaterial color="#15110f" metalness={0.38} roughness={0.96} />
    </mesh>
  </group>
);

const ArchedGate = ({ progress }: { progress: number }) => {
  const [texture] = useState(createAgedIronTexture);
  const leftHingeRef = useRef<THREE.Group>(null);
  const rightHingeRef = useRef<THREE.Group>(null);
  const motion = getB05MotionState(progress);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    if (leftHingeRef.current) leftHingeRef.current.rotation.y = motion.leftAngle;
    if (rightHingeRef.current) rightHingeRef.current.rotation.y = motion.rightAngle;
  });

  return (
    <group>
      <GateFrame />
      <group ref={leftHingeRef} position={[GATE_GEOMETRY.left.hingeX, 0, 0]}>
        <group scale={[GATE_GEOMETRY.left.mirrorX ? -1 : 1, 1, 1]}>
          <CanonicalArchedLeaf texture={texture} />
        </group>
      </group>
      <group ref={rightHingeRef} position={[GATE_GEOMETRY.right.hingeX, 0, 0]}>
        <group scale={[GATE_GEOMETRY.right.mirrorX ? -1 : 1, 1, 1]}>
          <CanonicalArchedLeaf texture={texture} />
        </group>
      </group>
    </group>
  );
};

const CameraRig = ({ progress }: { progress: number }) => {
  const motion = getB05MotionState(progress);

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
      <planeGeometry args={[4, 4]} />
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

const ArchedGateB05 = () => {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const motion = getB05MotionState(progress);

  const stopPlayback = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    stopPlayback();
    const startProgress = progress >= 1 ? 0 : progress;
    const startTime = performance.now() - startProgress * B05_DURATION_MS;
    setProgress(startProgress);

    const tick = (now: number) => {
      const nextProgress = Math.min((now - startTime) / B05_DURATION_MS, 1);
      setProgress(nextProgress);
      if (nextProgress < 1) frameRef.current = requestAnimationFrame(tick);
      else frameRef.current = null;
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [progress, stopPlayback]);

  useEffect(() => stopPlayback, [stopPlayback]);

  return (
    <main className="min-h-screen bg-black px-4 py-5 text-stone-100 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300/80">
            Feasibility POC · Biohazard 1-1 b05
          </p>
          <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-stone-100 sm:text-3xl">
            Procedural inward-opening arched gate
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-stone-400">
            The paired leaves use real-depth primitive geometry and a fixed-seed aged-iron
            texture. All visual material is generated locally; this page contains no game
            pixels or external images.
          </p>
        </header>

        <section
          aria-label="Interactive 3D arched gate demonstration"
          className="relative h-[60svh] min-h-[360px] max-h-[660px] w-full overflow-hidden rounded-2xl border border-orange-200/10 bg-black shadow-[0_28px_90px_rgba(92,37,11,0.24)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/65 to-transparent" />
          <Canvas
            camera={{ position: [0, 1.7, 8], fov: 52, near: 0.1, far: 80 }}
            dpr={[1, 1.75]}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <fog attach="fog" args={["#000000", 10, 24]} />
            <ambientLight intensity={0.24} />
            <hemisphereLight args={["#77899b", "#170a04", 0.34]} />
            <directionalLight position={[3.5, 7, 5]} intensity={1.05} color="#ffc18d" />
            <directionalLight position={[0, 3, 6]} intensity={0.22} color="#d8d3cc" />
            <directionalLight position={[-4, 3, -3]} intensity={0.58} color="#678ca8" />
            <pointLight position={[0, 1.8, 2.5]} intensity={0.48} color="#d95c28" />
            <ArchedGate progress={progress} />
            <CameraRig progress={progress} />
            <FadePlane opacity={motion.fadeOut} />
          </Canvas>
        </section>

        <section
          aria-label="Animation controls"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-stone-950 p-3"
        >
          <button
            type="button"
            aria-label="Play gate animation"
            onClick={play}
            className="min-h-10 rounded-lg bg-orange-300 px-5 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-orange-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200"
          >
            Play
          </button>
          <button
            type="button"
            aria-label="Reset gate animation"
            onClick={() => {
              stopPlayback();
              setProgress(0);
            }}
            className="min-h-10 rounded-lg border border-stone-600 px-5 py-2 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-400 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200"
          >
            Reset
          </button>
          <input
            id="b05-progress"
            aria-label="Gate animation progress"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={(event) => {
              stopPlayback();
              setProgress(Number(event.target.value));
            }}
            className="min-w-40 flex-1 basis-48 accent-orange-300"
          />
          <output
            htmlFor="b05-progress"
            className="w-12 text-right text-xs tabular-nums text-stone-400"
          >
            {(progress * 100).toFixed(0)}%
          </output>
        </section>
      </div>
    </main>
  );
};

export default ArchedGateB05;
