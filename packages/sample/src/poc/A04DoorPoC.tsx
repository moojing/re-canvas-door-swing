import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { easeInOutCubic, getDoorAnimationConfig } from "retro-horror-door";
import { setTextureColorSpace } from "./textureColorSpace";
import {
  resolveA04TextureUrl,
  type A04TexturePath,
} from "./a04TextureUrls";

type VariantId = "s1" | "s2";

type VariantDefinition = {
  id: VariantId;
  title: string;
  summary: string;
  notes: string;
};

const variants: VariantDefinition[] = [
  {
    id: "s1",
    title: "s1 鏤空鏽蝕柵欄門",
    summary: "規則直條 + 中央橫板 + 粗鐵閂，轉化為古老建築的潮濕下水道入口。",
    notes: "重點看厚重鏽蝕、濕苔與開門時鐵條的剪影。",
  },
  {
    id: "s2",
    title: "s2 鉚釘鑄鐵門",
    summary: "厚重鉚釘鐵板 + 壓條 + 粗橫把，模擬嚴重氧化的地下設施門。",
    notes: "重點看潮濕鐵皮、局部鏽穿與壓條是否仍保有實體厚度。",
  },
];

const DOOR_WIDTH = 3.42;
const DOOR_HEIGHT = 6.55;
const DOOR_DEPTH = 0.18;
const S2_PANEL_Z = DOOR_DEPTH / 2 + 0.04;
const S2_TRIM_Z = DOOR_DEPTH / 2 + 0.06;
const S2_HANDLE_Z = DOOR_DEPTH / 2 + 0.13;

type SurfaceMaterial = {
  color: THREE.ColorRepresentation;
  map: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  roughness: number;
  metalness: number;
};

type A04Materials = {
  s1Metal: SurfaceMaterial;
  s1Dark: SurfaceMaterial;
  s1Handle: SurfaceMaterial;
  s2Metal: SurfaceMaterial;
  s2Trim: SurfaceMaterial;
  s2Handle: SurfaceMaterial;
};

type AgingMark = {
  kind: "spot" | "streak";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color: THREE.ColorRepresentation;
  opacity: number;
};

const s1AgingMarks: AgingMark[] = [
  { kind: "spot", x: -0.34, y: 0.18, width: 0.42, height: 0.24, rotation: 0.2, color: "#3d231a", opacity: 0.42 },
  { kind: "spot", x: 0.23, y: -0.22, width: 0.32, height: 0.18, rotation: -0.4, color: "#bd7244", opacity: 0.34 },
  { kind: "streak", x: -0.1, y: 0.02, width: 0.026, height: 0.58, rotation: -0.05, color: "#d1b485", opacity: 0.22 },
  { kind: "streak", x: 0.39, y: 0.03, width: 0.018, height: 0.42, rotation: 0.18, color: "#241a15", opacity: 0.4 },
];

const s2AgingMarks: AgingMark[] = [
  { kind: "spot", x: -0.36, y: 0.34, width: 0.46, height: 0.64, rotation: -0.32, color: "#24423c", opacity: 0.23 },
  { kind: "spot", x: 0.28, y: 0.13, width: 0.34, height: 0.26, rotation: 0.48, color: "#74432b", opacity: 0.46 },
  { kind: "spot", x: -0.12, y: -0.39, width: 0.56, height: 0.22, rotation: 0.1, color: "#142a28", opacity: 0.28 },
  { kind: "spot", x: 0.39, y: -0.23, width: 0.2, height: 0.32, rotation: -0.5, color: "#b46d37", opacity: 0.34 },
  { kind: "streak", x: -0.42, y: 0.01, width: 0.022, height: 1.12, rotation: -0.07, color: "#152b2b", opacity: 0.4 },
  { kind: "streak", x: 0.08, y: 0.2, width: 0.016, height: 0.74, rotation: 0.11, color: "#c4af7d", opacity: 0.2 },
  { kind: "streak", x: 0.31, y: -0.04, width: 0.018, height: 0.9, rotation: -0.12, color: "#172624", opacity: 0.34 },
];

const AgingPatina = ({
  width,
  height,
  z,
  marks,
}: {
  width: number;
  height: number;
  z: number;
  marks: AgingMark[];
}) => (
  <group position={[0, 0, z]}>
    {marks.map((mark, index) => (
      <mesh
        key={index}
        position={[mark.x * width, mark.y * height, 0]}
        rotation={[0, 0, mark.rotation ?? 0]}
        scale={[mark.width, mark.height, 1]}
      >
        {mark.kind === "spot" ? <circleGeometry args={[0.5, 18]} /> : <planeGeometry args={[1, 1]} />}
        <meshBasicMaterial
          color={mark.color}
          transparent
          opacity={mark.opacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    ))}
  </group>
);

const useA04Texture = (
  file: A04TexturePath,
  color: boolean,
  repeatX: number,
  repeatY: number,
) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureUrl = resolveA04TextureUrl(import.meta.env.BASE_URL, file);

  useEffect(() => {
    let alive = true;
    const loaded = new THREE.TextureLoader().load(
      textureUrl,
      () => {
        if (alive) setTexture(loaded);
      },
      undefined,
      () => console.warn(`[poc-a04] 貼圖載入失敗:${textureUrl}`)
    );
    if (color) setTextureColorSpace(loaded);
    loaded.wrapS = THREE.RepeatWrapping;
    loaded.wrapT = THREE.RepeatWrapping;
    loaded.repeat.set(repeatX, repeatY);

    return () => {
      alive = false;
      setTexture(null);
      loaded.dispose();
    };
  }, [color, repeatX, repeatY, textureUrl]);

  return texture;
};

const useA04Materials = (): A04Materials => {
  const s1Diffuse = useA04Texture(
    "textures/a04/metal-plate-02-diffuse.jpg",
    true,
    1,
    1,
  );
  const s1Roughness = useA04Texture(
    "textures/a04/metal-plate-02-roughness.jpg",
    false,
    0.72,
    1.8,
  );
  const s2Diffuse = useA04Texture(
    "textures/a04/green-metal-rust-diffuse.jpg",
    true,
    1,
    1,
  );
  const s2Roughness = useA04Texture(
    "textures/a04/green-metal-rust-roughness.jpg",
    false,
    0.84,
    1.5,
  );

  return useMemo(
    () => ({
      s1Metal: {
        color: "#6a5445",
        map: s1Diffuse,
        roughnessMap: s1Roughness,
        roughness: 0.98,
        metalness: 0,
      },
      s1Dark: {
        color: "#342d28",
        map: s1Diffuse,
        roughnessMap: s1Roughness,
        roughness: 1,
        metalness: 0,
      },
      s1Handle: {
        color: "#76604b",
        map: s1Diffuse,
        roughnessMap: s1Roughness,
        roughness: 0.95,
        metalness: 0,
      },
      s2Metal: {
        color: "#77736a",
        map: s2Diffuse,
        roughnessMap: s2Roughness,
        roughness: 0.98,
        metalness: 0,
      },
      s2Trim: {
        color: "#4b4c43",
        map: s2Diffuse,
        roughnessMap: s2Roughness,
        roughness: 1,
        metalness: 0,
      },
      s2Handle: {
        color: "#71664d",
        map: s2Diffuse,
        roughnessMap: s2Roughness,
        roughness: 0.95,
        metalness: 0,
      },
    }),
    [s1Diffuse, s1Roughness, s2Diffuse, s2Roughness]
  );
};

const TexturedDetailOverlay = ({
  texture,
  color,
  width,
  height,
  position,
  rotation = [0, 0, 0],
  opacity,
}: {
  texture: THREE.Texture | null;
  color: THREE.ColorRepresentation;
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  opacity: number;
}) => {
  if (!texture) return null;

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
        toneMapped={false}
      />
    </mesh>
  );
};

const TexturedBox = ({
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  material,
  detailColor,
  detailOpacity = 0.82,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  material: SurfaceMaterial;
  detailColor: THREE.ColorRepresentation;
  detailOpacity?: number;
}) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <boxGeometry args={size} />
      <meshStandardMaterial {...material} />
    </mesh>
    <TexturedDetailOverlay
      texture={material.map}
      color={detailColor}
      width={Math.max(size[0] - 0.02, 0.02)}
      height={Math.max(size[1] - 0.02, 0.02)}
      position={[0, 0, size[2] / 2 + 0.003]}
      opacity={detailOpacity}
    />
    <TexturedDetailOverlay
      texture={material.map}
      color={detailColor}
      width={Math.max(size[0] - 0.02, 0.02)}
      height={Math.max(size[1] - 0.02, 0.02)}
      position={[0, 0, -size[2] / 2 - 0.003]}
      rotation={[0, Math.PI, 0]}
      opacity={detailOpacity}
    />
    <TexturedDetailOverlay
      texture={material.map}
      color={detailColor}
      width={Math.max(size[2] - 0.02, 0.02)}
      height={Math.max(size[1] - 0.02, 0.02)}
      position={[size[0] / 2 + 0.003, 0, 0]}
      rotation={[0, Math.PI / 2, 0]}
      opacity={detailOpacity}
    />
    <TexturedDetailOverlay
      texture={material.map}
      color={detailColor}
      width={Math.max(size[2] - 0.02, 0.02)}
      height={Math.max(size[1] - 0.02, 0.02)}
      position={[-size[0] / 2 - 0.003, 0, 0]}
      rotation={[0, -Math.PI / 2, 0]}
      opacity={detailOpacity}
    />
    <TexturedDetailOverlay
      texture={material.map}
      color={detailColor}
      width={Math.max(size[0] - 0.02, 0.02)}
      height={Math.max(size[2] - 0.02, 0.02)}
      position={[0, size[1] / 2 + 0.003, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      opacity={detailOpacity}
    />
    <TexturedDetailOverlay
      texture={material.map}
      color={detailColor}
      width={Math.max(size[0] - 0.02, 0.02)}
      height={Math.max(size[2] - 0.02, 0.02)}
      position={[0, -size[1] / 2 - 0.003, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      opacity={detailOpacity}
    />
  </group>
);

const FramePosts = ({
  material,
  detailColor,
  thickness,
  inset = 0,
  surfaceZ = 0,
}: {
  material: SurfaceMaterial;
  detailColor: THREE.ColorRepresentation;
  thickness: number;
  inset?: number;
  surfaceZ?: number;
}) => (
  <>
    <TexturedBox
      size={[DOOR_WIDTH - inset * 2, thickness, thickness]}
      position={[0, DOOR_HEIGHT / 2 - thickness / 2 - inset, surfaceZ]}
      material={material}
      detailColor={detailColor}
    />
    <TexturedBox
      size={[DOOR_WIDTH - inset * 2, thickness, thickness]}
      position={[0, -DOOR_HEIGHT / 2 + thickness / 2 + inset, surfaceZ]}
      material={material}
      detailColor={detailColor}
    />
    <TexturedBox
      size={[thickness, DOOR_HEIGHT - inset * 2, thickness]}
      position={[-DOOR_WIDTH / 2 + thickness / 2 + inset, 0, surfaceZ]}
      material={material}
      detailColor={detailColor}
    />
    <TexturedBox
      size={[thickness, DOOR_HEIGHT - inset * 2, thickness]}
      position={[DOOR_WIDTH / 2 - thickness / 2 - inset, 0, surfaceZ]}
      material={material}
      detailColor={detailColor}
    />
  </>
);

const S1DoorLeaf = ({
  materials,
  handleAngle,
}: {
  materials: A04Materials;
  handleAngle: number;
}) => {
  const barCount = 6;
  const usableWidth = DOOR_WIDTH - 0.72;
  const gap = usableWidth / (barCount - 1);
  const startX = -usableWidth / 2;

  return (
    <group>
      <TexturedBox
        size={[0.22, DOOR_HEIGHT, DOOR_DEPTH]}
        position={[DOOR_WIDTH / 2 - 0.11, 0, 0]}
        material={materials.s1Metal}
        detailColor="#ffffff"
      />
      <TexturedBox
        size={[0.22, DOOR_HEIGHT, DOOR_DEPTH]}
        position={[-DOOR_WIDTH / 2 + 0.11, 0, 0]}
        material={materials.s1Metal}
        detailColor="#ffffff"
      />
      <TexturedBox
        size={[DOOR_WIDTH, 0.22, DOOR_DEPTH]}
        position={[0, DOOR_HEIGHT / 2 - 0.11, 0]}
        material={materials.s1Metal}
        detailColor="#ffffff"
      />
      <TexturedBox
        size={[DOOR_WIDTH, 0.22, DOOR_DEPTH]}
        position={[0, -DOOR_HEIGHT / 2 + 0.11, 0]}
        material={materials.s1Metal}
        detailColor="#ffffff"
      />

      {Array.from({ length: barCount }).map((_, index) => (
        <TexturedBox
          key={index}
          size={[0.12, DOOR_HEIGHT - 0.34, 0.11]}
          position={[startX + gap * index, 0, DOOR_DEPTH * 0.04]}
          material={materials.s1Metal}
          detailColor="#ffffff"
          detailOpacity={0.82}
        />
      ))}

      <TexturedBox
        size={[DOOR_WIDTH - 0.24, 0.96, 0.18]}
        position={[0.04, 0, DOOR_DEPTH * 0.22]}
        material={materials.s1Dark}
        detailColor="#ffffff"
        detailOpacity={0.9}
      />
      <AgingPatina
        width={DOOR_WIDTH - 0.24}
        height={0.96}
        z={DOOR_DEPTH * 0.22 + 0.18 / 2 + 0.006}
        marks={s1AgingMarks}
      />

      <TexturedBox
        size={[0.28, 0.74, 0.18]}
        position={[DOOR_WIDTH / 2 - 0.22, 0.02, DOOR_DEPTH * 0.34]}
        material={materials.s1Dark}
        detailColor="#ffffff"
      />

      <mesh
        position={[DOOR_WIDTH / 2 - 0.22, 0.12, DOOR_DEPTH * 0.34 + 0.13]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.13, 0.13, 0.08, 16]} />
        <meshStandardMaterial {...materials.s1Handle} />
      </mesh>
      <group
        position={[DOOR_WIDTH / 2 - 0.22, 0.12, DOOR_DEPTH * 0.34 + 0.17]}
        rotation={[0, 0, handleAngle]}
      >
        <TexturedBox
          size={[0.62, 0.12, 0.12]}
          position={[-0.31, 0, 0]}
          material={materials.s1Handle}
          detailColor="#ffffff"
        />
      </group>
    </group>
  );
};

const S2DoorLeaf = ({
  materials,
  handleAngle,
}: {
  materials: A04Materials;
  handleAngle: number;
}) => (
  <group>
    <TexturedBox
      size={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH]}
      material={materials.s2Metal}
      detailColor="#ffffff"
      detailOpacity={1}
    />
    <AgingPatina
      width={DOOR_WIDTH}
      height={DOOR_HEIGHT}
      z={DOOR_DEPTH / 2 + 0.006}
      marks={s2AgingMarks}
    />

    <FramePosts
      material={materials.s2Trim}
      detailColor="#ffffff"
      thickness={0.13}
      inset={0.12}
      surfaceZ={S2_TRIM_Z}
    />

    <TexturedBox
      size={[DOOR_WIDTH - 0.44, DOOR_HEIGHT - 0.42, 0.05]}
      position={[0, 0, S2_PANEL_Z]}
      material={materials.s2Metal}
      detailColor="#ffffff"
      detailOpacity={0.9}
    />

    <TexturedBox
      size={[DOOR_WIDTH - 0.56, 0.12, 0.09]}
      position={[0, 1.58, S2_TRIM_Z]}
      material={materials.s2Trim}
      detailColor="#ffffff"
    />
    <TexturedBox
      size={[DOOR_WIDTH - 0.58, 0.12, 0.09]}
      position={[0, -1.62, S2_TRIM_Z]}
      material={materials.s2Trim}
      detailColor="#ffffff"
    />

    <TexturedBox
      size={[0.36, 1.28, 0.11]}
      position={[DOOR_WIDTH / 2 - 0.38, 0.04, S2_HANDLE_Z]}
      material={materials.s2Trim}
      detailColor="#c8d8c7"
    />

    <mesh position={[DOOR_WIDTH / 2 - 0.39, 0.48, S2_HANDLE_Z + 0.03]}>
      <cylinderGeometry args={[0.11, 0.11, 0.09, 16]} />
      <meshStandardMaterial {...materials.s2Handle} />
    </mesh>
    <group
      position={[DOOR_WIDTH / 2 - 0.5, 0.48, S2_HANDLE_Z + 0.08]}
      rotation={[0, 0, -handleAngle]}
    >
      <mesh position={[0, -0.29, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.58, 14]} />
        <meshStandardMaterial {...materials.s2Handle} />
      </mesh>
    </group>
  </group>
);

const A04Door = ({
  doorAngle,
  handleAngle,
  variant,
}: {
  doorAngle: number;
  handleAngle: number;
  variant: VariantId;
}) => {
  const doorGroupRef = useRef<THREE.Group>(null);
  const materials = useA04Materials();

  useFrame(() => {
    if (doorGroupRef.current) {
      doorGroupRef.current.rotation.y = -doorAngle * (Math.PI / 2);
    }
  });

  return (
    <group>
      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[DOOR_WIDTH + 0.78, DOOR_HEIGHT + 0.78, 0.08]} />
        <meshStandardMaterial color="#0f1116" roughness={1} metalness={0} />
      </mesh>

      <group ref={doorGroupRef} position={[-DOOR_WIDTH / 2, 0, 0]}>
        <group position={[DOOR_WIDTH / 2, 0, 0]}>
          {variant === "s1" ? (
            <S1DoorLeaf materials={materials} handleAngle={handleAngle} />
          ) : (
            <S2DoorLeaf materials={materials} handleAngle={handleAngle} />
          )}
        </group>
      </group>
    </group>
  );
};

const FadePlane = ({ opacity, cameraZ }: { opacity: number; cameraZ: number }) => (
  <mesh position={[0, 0, cameraZ - 0.5]}>
    <planeGeometry args={[20, 20]} />
    <meshBasicMaterial color="#000000" transparent opacity={opacity} depthTest={false} />
  </mesh>
);

const CameraRig = ({ z }: { z: number }) => {
  useFrame(({ camera }) => {
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, 0);
  });
  return null;
};

const A04DoorPoC = () => {
  const config = getDoorAnimationConfig("direct-entry");
  const [progress, setProgress] = useState(0);
  const [variant, setVariant] = useState<VariantId>("s1");
  const frameRef = useRef<number | null>(null);

  const play = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / config.duration, 1);
      setProgress(p);
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
      else frameRef.current = null;
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [config.duration]);

  const stopPlayback = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const state = config.getState(easeInOutCubic(progress), {
    linearProgress: progress,
  });
  const activeVariant = variants.find((entry) => entry.id === variant) ?? variants[0];

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-xl font-bold">
          PoC:1-2 a04 單門-粗把手(共用骨架 + s1/s2 切換)
        </h1>
        <p className="max-w-3xl text-sm text-white/60">
          驗證 `1-2 a04` 能否用同一套單門鉸鏈時間軸，僅切換低複雜度幾何完成兩個變體。
          這是可行性驗證版：以原創嚴重鏽蝕鑄鐵貼圖，驗證古老建築下水道門的電影式開門鏡頭。
        </p>

        <div className="flex flex-wrap gap-3">
          {variants.map((entry) => {
            const isActive = entry.id === variant;
            return (
              <button
                key={entry.id}
                onClick={() => setVariant(entry.id)}
                className={`rounded-lg border px-4 py-2 text-left transition ${
                  isActive
                    ? "border-white bg-white text-black"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <div className="text-sm font-semibold">{entry.title}</div>
                <div className={`text-xs ${isActive ? "text-black/70" : "text-white/55"}`}>
                  {entry.summary}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
          <div className="font-medium text-white">{activeVariant.title}</div>
          <div className="mt-1">{activeVariant.summary}</div>
          <div className="mt-2 text-xs text-white/50">{activeVariant.notes}</div>
        </div>

        <div className="h-[520px] w-full overflow-hidden rounded-xl border border-[#6f6048]/30 bg-[#030605]">
          <Canvas
            camera={{ position: [0, 0, 8], fov: 60 }}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <fog attach="fog" args={["#020504", 7, 13]} />
            <ambientLight intensity={0.2} />
            <directionalLight position={[2.8, 4.8, 4]} intensity={0.82} color="#c29d70" />
            <directionalLight position={[-2.4, 1.4, -2]} intensity={0.3} color="#426b5b" />
            <pointLight position={[0.7, 2.1, 2.6]} intensity={0.68} color="#c87743" />
            <pointLight position={[-1.9, -2.4, 1.8]} intensity={0.24} color="#38746b" />
            <A04Door
              doorAngle={state.doorAngle}
              handleAngle={state.handleAngle ?? 0}
              variant={variant}
            />
            <CameraRig z={state.cameraPosition[2]} />
            <FadePlane opacity={state.fadeOut} cameraZ={state.cameraPosition[2]} />
          </Canvas>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={play}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/85"
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
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={(e) => {
              stopPlayback();
              setProgress(Number(e.target.value));
            }}
            className="w-56"
          />
          <span className="text-xs tabular-nums text-white/60">
            {(progress * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default A04DoorPoC;
