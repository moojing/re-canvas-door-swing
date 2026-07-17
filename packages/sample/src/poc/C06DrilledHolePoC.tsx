import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { setTextureColorSpace } from "./textureColorSpace";
import {
  resolveC06TextureUrl,
  type C06TexturePath,
} from "./c06TextureUrls";
import {
  C06_DURATION_SECONDS,
  C06_EDGE_BRICKS,
  getC06CameraState,
  type C06CameraState,
} from "./c06SceneModel";

type Vec3 = [number, number, number];

type TexturedBoxProps = {
  size: readonly [number, number, number];
  position: readonly [number, number, number];
  materials: THREE.Material[];
  rotationZ?: number;
};

type IdleView = "opening" | "end";

const WALL_PANELS: readonly { id: string; position: Vec3; size: Vec3 }[] = [
  { id: "left", position: [-3.55, 0, 0], size: [3.2, 6.5, 0.92] },
  { id: "right", position: [3.55, 0, 0], size: [3.2, 6.5, 0.92] },
  { id: "top", position: [0, 2.45, 0], size: [3.9, 1.6, 0.92] },
  { id: "bottom", position: [0, -2.42, 0], size: [3.9, 1.66, 0.92] },
] as const;

const useC06Texture = (
  file: C06TexturePath,
  repeatX: number,
  repeatY: number,
) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureUrl = resolveC06TextureUrl(import.meta.env.BASE_URL, file);

  useEffect(() => {
    let alive = true;
    const loaded = new THREE.TextureLoader().load(
      textureUrl,
      () => {
        if (alive) setTexture(loaded);
      },
      undefined,
      () => console.warn(`[poc-c06] 貼圖載入失敗:${textureUrl}`),
    );
    setTextureColorSpace(loaded);
    loaded.wrapS = THREE.RepeatWrapping;
    loaded.wrapT = THREE.RepeatWrapping;
    loaded.repeat.set(repeatX, repeatY);

    return () => {
      alive = false;
      setTexture(null);
      loaded.dispose();
    };
  }, [repeatX, repeatY, textureUrl]);

  return texture;
};

const useBoxMaterials = (
  frontMap: THREE.Texture | null,
  coreMap: THREE.Texture | null
) => {
  const materials = useMemo(() => {
    const coreColor = coreMap ? "#927868" : "#5a382b";
    const faceColor = frontMap ? "#aa8e79" : "#4b2d24";
    const coreMaterials = Array.from(
      { length: 4 },
      () =>
        new THREE.MeshStandardMaterial({
          map: coreMap,
          color: coreColor,
          roughness: 1,
        })
    );
    const faceMaterials = Array.from(
      { length: 2 },
      () =>
        new THREE.MeshStandardMaterial({
          map: frontMap,
          color: faceColor,
          roughness: 0.96,
        })
    );
    return [...coreMaterials, ...faceMaterials];
  }, [coreMap, frontMap]);

  useEffect(
    () => () => {
      materials.forEach((material) => material.dispose());
    },
    [materials]
  );

  return materials;
};

const useRepeatedTexture = (
  source: THREE.Texture | null,
  repeatX: number,
  repeatY: number
) => {
  const texture = useMemo(() => {
    if (!source) return null;
    const clone = source.clone();
    clone.wrapS = THREE.RepeatWrapping;
    clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(repeatX, repeatY);
    clone.needsUpdate = true;
    return clone;
  }, [repeatX, repeatY, source]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
};

const TexturedBox = ({
  size,
  position,
  materials,
  rotationZ = 0,
}: TexturedBoxProps) => {
  const boxSize: Vec3 = [size[0], size[1], size[2]];
  const boxPosition: Vec3 = [position[0], position[1], position[2]];

  return (
    <mesh
      position={boxPosition}
      rotation={[0, 0, rotationZ]}
      material={materials}
      castShadow
      receiveShadow
    >
      <boxGeometry args={boxSize} />
    </mesh>
  );
};

const WallPanel = ({
  size,
  position,
  wallMap,
  coreMap,
}: {
  size: Vec3;
  position: Vec3;
  wallMap: THREE.Texture | null;
  coreMap: THREE.Texture | null;
}) => {
  // One texture tile contains roughly 7.5 x 15 bricks. Scale per panel so
  // every visible wall face keeps the same brick size in world space.
  const scaledWallMap = useRepeatedTexture(wallMap, size[0] / 3.375, size[1] / 3.3);
  const materials = useBoxMaterials(scaledWallMap, coreMap);

  return <TexturedBox size={size} position={position} materials={materials} />;
};

const BrokenWall = ({
  wallMap,
  coreMap,
  edgeMaterials,
}: {
  wallMap: THREE.Texture | null;
  coreMap: THREE.Texture | null;
  edgeMaterials: THREE.Material[];
}) => (
  <group>
    {WALL_PANELS.map((panel) => (
      <WallPanel
        key={panel.id}
        size={panel.size}
        position={panel.position}
        wallMap={wallMap}
        coreMap={coreMap}
      />
    ))}

    {C06_EDGE_BRICKS.map((brick) => (
      <TexturedBox
        key={brick.id}
        size={brick.size}
        position={brick.position}
        rotationZ={brick.rotationZ}
        materials={edgeMaterials}
      />
    ))}
  </group>
);

const CameraTravel = ({
  playing,
  idleView,
  onFrame,
  onComplete,
}: {
  playing: boolean;
  idleView: IdleView;
  onFrame: (state: C06CameraState) => void;
  onComplete: () => void;
}) => {
  const startedAt = useRef<number | null>(null);
  const completed = useRef(false);

  useFrame(({ camera, clock }) => {
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current;
    const state = getC06CameraState(
      playing ? elapsed : idleView === "end" ? C06_DURATION_SECONDS : 0.75
    );

    camera.position.set(0, 0.12, state.z);
    camera.lookAt(0, 0.12, state.z - 6);
    onFrame(state);

    if (playing && !completed.current && elapsed >= C06_DURATION_SECONDS) {
      completed.current = true;
      onComplete();
    }
  });

  return null;
};

const C06Scene = ({
  runId,
  playing,
  idleView,
  onFrame,
  onComplete,
}: {
  runId: number;
  playing: boolean;
  idleView: IdleView;
  onFrame: (state: C06CameraState) => void;
  onComplete: () => void;
}) => {
  const wallMap = useC06Texture("textures/c06/aged-brick-albedo.png", 1, 1);
  const edgeFaceMap = useC06Texture(
    "textures/c06/aged-brick-albedo.png",
    0.16,
    0.065,
  );
  const coreMap = useC06Texture(
    "textures/c06/broken-brick-core-albedo.png",
    0.72,
    0.72,
  );
  const edgeMaterials = useBoxMaterials(edgeFaceMap, coreMap);

  return (
    <>
      <color attach="background" args={["#020303"]} />
      <fog attach="fog" args={["#020303", 7, 20]} />
      <ambientLight intensity={0.16} color="#9a9288" />
      <directionalLight position={[-3.5, 5.5, 6]} intensity={0.72} color="#d5b17e" castShadow />
      <pointLight position={[0.8, 1.3, 2.2]} intensity={0.58} color="#b75a33" distance={10} />
      <BrokenWall wallMap={wallMap} coreMap={coreMap} edgeMaterials={edgeMaterials} />
      <CameraTravel
        key={`${runId}-${playing ? "playing" : idleView}`}
        playing={playing}
        idleView={idleView}
        onFrame={onFrame}
        onComplete={onComplete}
      />
    </>
  );
};

const C06DrilledHolePoC = () => {
  const [runId, setRunId] = useState(0);
  const [isPlaying, setIsPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [idleView, setIdleView] = useState<IdleView>("opening");
  const fadeRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleFrame = useCallback((state: C06CameraState) => {
    if (fadeRef.current) fadeRef.current.style.opacity = state.fadeOpacity.toFixed(3);
    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${state.progress.toFixed(4)})`;
    }
  }, []);

  const replay = useCallback(() => {
    setIdleView("opening");
    setIsPlaying(true);
    setRunId((current) => current + 1);
  }, []);

  const skipMotion = useCallback(() => {
    setIdleView("opening");
    setIsPlaying(false);
    setRunId((current) => current + 1);
  }, []);

  const handleComplete = useCallback(() => {
    setIdleView("end");
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      setIdleView("opening");
      setIsPlaying(false);
      setRunId((current) => current + 1);
    };
    media.addEventListener("change", handlePreferenceChange);
    return () => media.removeEventListener("change", handlePreferenceChange);
  }, []);

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#050604] font-serif text-[#eee4d2]">
      <div className="absolute inset-0">
        <Canvas
          shadows
          frameloop={isPlaying ? "always" : "demand"}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.12, 8], fov: 52, near: 0.1, far: 50 }}
          gl={{ antialias: true, alpha: false }}
        >
          <C06Scene
            runId={runId}
            playing={isPlaying}
            idleView={idleView}
            onFrame={handleFrame}
            onComplete={handleComplete}
          />
        </Canvas>
        <div ref={fadeRef} className="pointer-events-none absolute inset-0 z-10 bg-black" />
        <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.72)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-black/80 to-transparent" />
      </div>

      <header className="relative z-30 flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
        <div>
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c8aa77] transition-colors hover:text-[#f1d7a8]"
          >
            返回 Door PoCs
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#f2eadc] sm:text-4xl">
            1-3 c06 · 鑽洞轉場
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#baa98f]">
            Camera-only passage study
          </p>
        </div>

        <button
          type="button"
          onClick={isPlaying ? skipMotion : replay}
          className="border border-[#b08c58]/60 bg-black/55 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[#ead8ba] backdrop-blur-sm transition hover:border-[#ddb77d] hover:bg-[#2c2117]/80"
        >
          {isPlaying ? "跳過動畫" : "播放一次"}
        </button>
        <span className="sr-only" aria-live="polite">
          {isPlaying ? "鏡頭正在穿越牆洞" : idleView === "end" ? "動畫已完成" : "動畫已停止"}
        </span>
      </header>

      <section className="absolute inset-x-4 bottom-4 z-30 sm:inset-x-8 sm:bottom-7">
        <div className="mx-auto max-w-5xl border border-[#9b7b51]/35 bg-[#090a08]/80 p-4 shadow-2xl shadow-black/70 backdrop-blur-md sm:p-5">
          <div className="mb-4 h-px overflow-hidden bg-white/10">
            <div
              ref={progressRef}
              className="h-full origin-left scale-x-0 bg-gradient-to-r from-[#704629] via-[#c39358] to-[#d9c39b]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1.15fr_1fr_1fr] sm:gap-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b98e55]">Geometry</p>
              <p className="mt-1 text-sm leading-relaxed text-[#e2d7c5]">
            四片厚牆 + 33 塊等尺寸 BoxGeometry，形成錯縫直角破口與可見磚芯。
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b98e55]">Motion</p>
              <p className="mt-1 text-sm leading-relaxed text-[#c9bead]">
                無可動件；鏡頭固定高度，沿 Z 軸純前推穿越。
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b98e55]">Material</p>
              <p className="mt-1 text-sm leading-relaxed text-[#c9bead]">
                牆面與斷面皆為本專案生成的原創材質，未使用遊戲截圖像素。
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default C06DrilledHolePoC;
