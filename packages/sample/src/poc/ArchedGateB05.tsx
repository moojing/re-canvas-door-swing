import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  B05_BAR_RADIUS,
  createB05GateGeometry,
  createB05LeafGeometry,
  type B05BoxMember,
  type B05Collar,
  type B05Vector3,
} from "./b05Geometry";
import { B05_CAMERA_START_Z, B05_DURATION_MS, getB05MotionState } from "./b05Motion";
import {
  B05_OFFICIAL_APPEARANCE_CONFIG,
  createAgedIronMaterialPixels,
} from "./b05ProceduralMaterials";
import { projectB05TextureUv } from "./b05TextureMapping";

const LEAF_GEOMETRY = createB05LeafGeometry();
const GATE_GEOMETRY = createB05GateGeometry();
const ARCH_CURVE = new THREE.CatmullRomCurve3(
  LEAF_GEOMETRY.archPath.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
);

type AgedIronResources = {
  colorTexture: THREE.CanvasTexture;
  roughnessTexture: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
};

const createTexture = (pixels: Uint8ClampedArray, encoding: THREE.TextureEncoding) => {
  const canvas = document.createElement("canvas");
  canvas.width = B05_OFFICIAL_APPEARANCE_CONFIG.textureSize;
  canvas.height = B05_OFFICIAL_APPEARANCE_CONFIG.textureSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create the B05 procedural texture canvas");
  }

  const imageData = new ImageData(
    pixels,
    B05_OFFICIAL_APPEARANCE_CONFIG.textureSize,
    B05_OFFICIAL_APPEARANCE_CONFIG.textureSize,
  );
  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = encoding;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...B05_OFFICIAL_APPEARANCE_CONFIG.textureRepeat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
};

const createAgedIronResources = () => {
  const { colorPixels, roughnessPixels } = createAgedIronMaterialPixels(
    B05_OFFICIAL_APPEARANCE_CONFIG.textureSize,
    B05_OFFICIAL_APPEARANCE_CONFIG.textureSize,
    B05_OFFICIAL_APPEARANCE_CONFIG.seed,
  );
  const colorTexture = createTexture(colorPixels, THREE.sRGBEncoding);
  const roughnessTexture = createTexture(roughnessPixels, THREE.LinearEncoding);
  const material = new THREE.MeshStandardMaterial({
    map: colorTexture,
    roughnessMap: roughnessTexture,
    color: 0xffffff,
    metalness: 0.58,
    roughness: 1,
  });

  return { colorTexture, roughnessTexture, material };
};

const applyWorldScaleUv = (
  geometry: THREE.BufferGeometry,
  objectPosition: B05Vector3,
) => {
  const positions = geometry.getAttribute("position");
  const uvs = geometry.getAttribute("uv");

  for (let index = 0; index < positions.count; index += 1) {
    const [u, v] = projectB05TextureUv(
      [positions.getX(index), positions.getY(index), positions.getZ(index)],
      objectPosition,
    );
    uvs.setXY(index, u, v);
  }
  uvs.needsUpdate = true;
};

const IronBox = ({ member, material }: {
  member: B05BoxMember;
  material: THREE.MeshStandardMaterial;
}) => (
  <mesh
    position={[...member.position]}
    rotation={member.rotation ? [...member.rotation] : undefined}
    material={material}
  >
    <boxGeometry
      args={[...member.size]}
      onUpdate={(geometry) => applyWorldScaleUv(geometry, member.position)}
    />
  </mesh>
);

const IronCollar = ({ collar, material }: {
  collar: B05Collar;
  material: THREE.MeshStandardMaterial;
}) => (
  <mesh position={[...collar.position]} material={material}>
    <cylinderGeometry
      args={[collar.radius, collar.radius, collar.height, 12]}
      onUpdate={(geometry) => applyWorldScaleUv(geometry, collar.position)}
    />
  </mesh>
);

const CanonicalArchedLeaf = ({ material }: { material: THREE.MeshStandardMaterial }) => (
  <group>
    <IronBox member={LEAF_GEOMETRY.lowerPanel} material={material} />
    <IronBox member={LEAF_GEOMETRY.panelInset} material={material} />
    <IronBox member={LEAF_GEOMETRY.lowerRail} material={material} />
    <IronBox member={LEAF_GEOMETRY.middleRail} material={material} />
    <IronBox member={LEAF_GEOMETRY.outerStile} material={material} />
    <IronBox member={LEAF_GEOMETRY.centerStile} material={material} />

    {LEAF_GEOMETRY.bars.map((bar, index) => (
      <IronBox key={`bar-${index}`} member={bar} material={material} />
    ))}

    <mesh material={material}>
      <tubeGeometry
        args={[ARCH_CURVE, 64, B05_BAR_RADIUS * 1.35, 8, false]}
        onUpdate={(geometry) => applyWorldScaleUv(geometry, [0, 0, 0])}
      />
    </mesh>

    {LEAF_GEOMETRY.panelTrim.map((member, index) => (
      <IronBox key={`panel-trim-${index}`} member={member} material={material} />
    ))}

    {LEAF_GEOMETRY.barCollars.map((collar, index) => (
      <IronCollar key={`bar-collar-${index}`} collar={collar} material={material} />
    ))}

    {LEAF_GEOMETRY.plaqueTrim.map((member, index) => (
      <IronBox key={`plaque-trim-${index}`} member={member} material={material} />
    ))}
  </group>
);

const ArchedGate = ({ progress }: { progress: number }) => {
  const [resources, setResources] = useState<AgedIronResources | null>(null);
  const leftHingeRef = useRef<THREE.Group>(null);
  const rightHingeRef = useRef<THREE.Group>(null);
  const motion = getB05MotionState(progress);

  useEffect(() => {
    const effectResources = createAgedIronResources();
    setResources(effectResources);

    return () => {
      effectResources.material.dispose();
      effectResources.colorTexture.dispose();
      effectResources.roughnessTexture.dispose();
    };
  }, []);

  useFrame(() => {
    if (leftHingeRef.current) leftHingeRef.current.rotation.y = motion.leftAngle;
    if (rightHingeRef.current) rightHingeRef.current.rotation.y = motion.rightAngle;
  });

  if (!resources) return null;

  return (
    <group>
      <group ref={leftHingeRef} position={[GATE_GEOMETRY.left.hingeX, 0, 0]}>
        <group scale={[GATE_GEOMETRY.left.mirrorX ? -1 : 1, 1, 1]}>
          <CanonicalArchedLeaf material={resources.material} />
        </group>
      </group>
      <group ref={rightHingeRef} position={[GATE_GEOMETRY.right.hingeX, 0, 0]}>
        <group scale={[GATE_GEOMETRY.right.mirrorX ? -1 : 1, 1, 1]}>
          <CanonicalArchedLeaf material={resources.material} />
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
            camera={{ position: [0, 2.65, B05_CAMERA_START_Z], fov: 52, near: 0.1, far: 80 }}
            dpr={[1, 1.75]}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <fog attach="fog" args={["#000000", 10, 24]} />
            <ambientLight intensity={0.6} />
            <hemisphereLight args={["#77899b", "#170a04", 0.65]} />
            <directionalLight position={[3.5, 7, 5]} intensity={1.25} color="#d8c0aa" />
            <directionalLight position={[0, 3, 6]} intensity={0.9} color="#d8d3cc" />
            <directionalLight position={[-4, 3, -3]} intensity={0.45} color="#678ca8" />
            <pointLight position={[0, 1.8, 2.5]} intensity={0.1} color="#bda38c" />
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
