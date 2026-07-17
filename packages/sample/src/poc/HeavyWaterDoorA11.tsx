/**
 * PoC:1-2 a11 重型水門
 *
 * 門體由門板、上下橫樑、中央凸板、閥輪座與閥輪等 primitive 組成。
 * 動畫沿用 door-entrance 的 direct-entry 時間軸(開門 → 前推 → 淡出),不動 lib。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getDoorAnimationConfig,
  easeInOutCubic,
} from "door-entrance";
import {
  createA11MaterialPixels as generateA11ProceduralMaterials,
} from "./a11ProceduralMaterials";

const SRC = {
  door: { w: 335, h: 594, x: 485, y: 178 },
  railTop: { w: 340, h: 96, x: 482, y: 236 },
  railBottom: { w: 340, h: 84, x: 482, y: 688 },
  panel: { w: 300, h: 280, x: 492, y: 384 },
  valveHousing: { w: 196, h: 150, x: 628, y: 420 },
  wheel: { cx: 700, cy: 496, r: 68 },
};

const DOOR_HEIGHT = 6;
const S = DOOR_HEIGHT / SRC.door.h; // px → 世界單位
const DOOR_WIDTH = SRC.door.w * S;
const TEXTURE_SIZE = 256;
const MATERIAL_METALNESS = 0.65;
const MATERIAL_ROUGHNESS = 0.82;

type A11TextureMaps = Readonly<{
  colorMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
}>;

const createDataTexture = (
  pixels: Uint8ClampedArray,
  encoding: THREE.TextureEncoding,
): THREE.DataTexture => {
  const texture = new THREE.DataTexture(
    new Uint8Array(pixels),
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.encoding = encoding;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
};

const useA11ProceduralTextures = (): A11TextureMaps => {
  const textures = useMemo(() => {
    const { colorPixels, roughnessPixels } = generateA11ProceduralMaterials(
      TEXTURE_SIZE,
      TEXTURE_SIZE,
      1101,
    );
    return {
      colorMap: createDataTexture(colorPixels, THREE.sRGBEncoding),
      roughnessMap: createDataTexture(roughnessPixels, THREE.LinearEncoding),
    };
  }, []);

  useEffect(
    () => () => {
      textures.colorMap.dispose();
      textures.roughnessMap.dispose();
    },
    [textures],
  );

  return textures;
};

/** 來源 px 矩形 → 門局部座標(門中心為原點,+y 向上) */
const rectToLocal = (r: { w: number; h: number; x: number; y: number }) => ({
  w: r.w * S,
  h: r.h * S,
  x: (r.x + r.w / 2 - SRC.door.x - SRC.door.w / 2) * S,
  y: (SRC.door.h / 2 - (r.y + r.h / 2 - SRC.door.y)) * S,
});

/** 通用「凸出部件」:有厚度的 Box + 正面細節層 */
const ReliefPart = ({
  rect,
  z,
  depth,
  sideColor,
  colorMap,
  roughnessMap,
}: {
  rect: { w: number; h: number; x: number; y: number };
  z: number;
  depth: number;
  sideColor: string;
} & A11TextureMaps) => (
  <group position={[rect.x, rect.y, z]}>
    <mesh>
      <boxGeometry args={[rect.w, rect.h, depth]} />
      <meshStandardMaterial
        color={sideColor}
        map={colorMap}
        roughnessMap={roughnessMap}
        metalness={MATERIAL_METALNESS}
        roughness={MATERIAL_ROUGHNESS}
      />
    </mesh>
    <mesh position={[0, 0, depth / 2 + 0.002]}>
      <planeGeometry args={[rect.w, rect.h]} />
      <meshStandardMaterial
        color={sideColor}
        map={colorMap}
        roughnessMap={roughnessMap}
        metalness={MATERIAL_METALNESS}
        roughness={MATERIAL_ROUGHNESS}
      />
    </mesh>
  </group>
);

const ValveWheel = ({
  position,
  spinAngle,
  colorMap,
  roughnessMap,
}: {
  position: [number, number, number];
  spinAngle: number;
} & A11TextureMaps) => {
  const r = SRC.wheel.r * S;
  const wheelRef = useRef<THREE.Mesh>(null);
  // 繞圓柱自身軸(局部 y)轉 = 閥輪解鎖轉動
  useFrame(() => {
    if (wheelRef.current) wheelRef.current.rotation.y = spinAngle;
  });
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh ref={wheelRef}>
        <cylinderGeometry args={[r, r, 0.14, 24]} />
        <meshStandardMaterial
          attach="material-0"
          color="#75645a"
          map={colorMap}
          roughnessMap={roughnessMap}
          metalness={MATERIAL_METALNESS}
          roughness={MATERIAL_ROUGHNESS}
        />
        <meshStandardMaterial
          attach="material-1"
          color="#806e61"
          map={colorMap}
          roughnessMap={roughnessMap}
          metalness={MATERIAL_METALNESS}
          roughness={MATERIAL_ROUGHNESS}
        />
        <meshStandardMaterial
          attach="material-2"
          color="#66564e"
          map={colorMap}
          roughnessMap={roughnessMap}
          metalness={MATERIAL_METALNESS}
          roughness={MATERIAL_ROUGHNESS}
        />
      </mesh>
    </group>
  );
};

const A11Door = ({
  doorAngle,
  wheelAngle,
  colorMap,
  roughnessMap,
}: {
  doorAngle: number;
  wheelAngle: number;
} & A11TextureMaps) => {
  const doorGroupRef = useRef<THREE.Group>(null);

  const railTop = rectToLocal(SRC.railTop);
  const railBottom = rectToLocal(SRC.railBottom);
  const panel = rectToLocal(SRC.panel);
  const housing = rectToLocal(SRC.valveHousing);
  const wheelPos: [number, number, number] = [
    (SRC.wheel.cx - SRC.door.x - SRC.door.w / 2) * S,
    (SRC.door.h / 2 - (SRC.wheel.cy - SRC.door.y)) * S,
    0.30,
  ];

  useFrame(() => {
    if (doorGroupRef.current) {
      doorGroupRef.current.rotation.y = -doorAngle * (Math.PI / 2);
    }
  });

  return (
    <group>
      {/* 門框(沿用 lib 的暗色框) */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[DOOR_WIDTH + 0.25, DOOR_HEIGHT + 0.25, 0.2]} />
        <meshStandardMaterial
          color="#2d2520"
          metalness={MATERIAL_METALNESS}
          roughness={MATERIAL_ROUGHNESS}
        />
      </mesh>

      {/* 鉸鏈在左緣 */}
      <group ref={doorGroupRef} position={[-DOOR_WIDTH / 2, 0, 0]}>
        <group position={[DOOR_WIDTH / 2, 0, 0]}>
          {/* 門板本體 */}
          <mesh>
            <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.15]} />
            <meshStandardMaterial
              color="#77665d"
              map={colorMap}
              roughnessMap={roughnessMap}
              metalness={MATERIAL_METALNESS}
              roughness={MATERIAL_ROUGHNESS}
            />
          </mesh>
          <mesh position={[0, 0, 0.077]}>
            <planeGeometry args={[DOOR_WIDTH, DOOR_HEIGHT]} />
            <meshStandardMaterial
              color="#77665d"
              map={colorMap}
              roughnessMap={roughnessMap}
              metalness={MATERIAL_METALNESS}
              roughness={MATERIAL_ROUGHNESS}
            />
          </mesh>

          {/* 浮凸部件:上/下橫樑、中央面板、閥輪座、閥輪 */}
          <ReliefPart
            rect={railTop}
            z={0.12}
            depth={0.12}
            sideColor="#8d8578"
            colorMap={colorMap}
            roughnessMap={roughnessMap}
          />
          <ReliefPart
            rect={railBottom}
            z={0.12}
            depth={0.12}
            sideColor="#8d8578"
            colorMap={colorMap}
            roughnessMap={roughnessMap}
          />
          <ReliefPart
            rect={panel}
            z={0.14}
            depth={0.14}
            sideColor="#74615a"
            colorMap={colorMap}
            roughnessMap={roughnessMap}
          />
          <ReliefPart
            rect={housing}
            z={0.22}
            depth={0.16}
            sideColor="#867d70"
            colorMap={colorMap}
            roughnessMap={roughnessMap}
          />
          <ValveWheel
            position={wheelPos}
            spinAngle={wheelAngle}
            colorMap={colorMap}
            roughnessMap={roughnessMap}
          />
        </group>
      </group>
    </group>
  );
};

/** 淡出黑幕:跟著相機走(固定 z 會被前推的相機超過而失效) */
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

const HeavyWaterDoorA11 = () => {
  const config = getDoorAnimationConfig("direct-entry");
  const { colorMap, roughnessMap } = useA11ProceduralTextures();
  const [progress, setProgress] = useState(0);
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

  // 手動操作(重置/拉桿)前先取消進行中的播放,避免下一個 RAF tick 蓋掉使用者選的進度
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

  const eased = easeInOutCubic(progress);
  const state = config.getState(eased, {
    linearProgress: progress,
  });

  // 閥輪解鎖:原片是「先轉閥輪、轉完門才開」。direct-entry 的門在 eased 0.18 起擺,
  // 閥輪安排在 0.03–0.18 轉約 5/8 圈,門動時剛好轉完。
  const wheelAngle =
    -Math.min(Math.max((eased - 0.03) / 0.15, 0), 1) * Math.PI * 1.25;

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-xl font-bold">
          PoC:1-2 a11 重型水門(Box 疊加 + 程序材質)
        </h1>
        <p className="text-sm text-white/60">
          驗證「浮凸造型門可用 primitive 自組,不需外找模型」。Material is
          deterministic and procedurally generated; it contains no original game
          pixels.
        </p>

        <div className="h-[520px] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <Canvas
            camera={{ position: [0, 0, 8], fov: 60 }}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <ambientLight intensity={0.25} />
            <directionalLight position={[2, 5, 5]} intensity={0.7} />
            <directionalLight position={[-3, 2, -4]} intensity={0.35} color="#8fa8c7" />
            <pointLight position={[0, 2, 3]} intensity={0.5} color="#ff8844" />
            <A11Door
              doorAngle={state.doorAngle}
              wheelAngle={wheelAngle}
              colorMap={colorMap}
              roughnessMap={roughnessMap}
            />
            <CameraRig z={state.cameraPosition[2]} />
            <FadePlane opacity={state.fadeOut} cameraZ={state.cameraPosition[2]} />
          </Canvas>
        </div>

        <div className="flex items-center gap-3">
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

export default HeavyWaterDoorA11;
