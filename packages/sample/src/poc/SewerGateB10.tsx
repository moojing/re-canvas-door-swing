/**
 * PoC:1-2 b10 下水道閘門(Biohazard 2)
 *
 * 驗證目標:「齒緣垂直閘門」不需外找模型——齒形用 THREE.Shape 描 2D 輪廓
 * 再 ExtrudeGeometry 擠出厚度即可,齒的內側面天生存在(alpha 貼圖做不到的部分)。
 * 場景 = 齒緣閘門(垂直上升)+ 地面固定齒條(互補齒形)+ 門上拉桿盒,黑背景特寫。
 *
 * ⚠️ 貼圖是遊戲畫面截圖(placeholder,gitignored,不進發佈包)。
 *    執行 scripts/poc/extract-b10-textures.sh 產生。
 *    正式版需以自製 / CC0 材質替換。
 *
 * 動畫沿用 door-entrance 的 direct-entry 時間軸(doorAngle 改驅動「上升量」),不動 lib。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getDoorAnimationConfig, easeInOutCubic } from "door-entrance";

const TEX_BASE = "/textures/poc-b10";

// ---- 來源影格量測值(px,亮度剖面量得)。與 extract-b10-textures.sh 的 crop 參數同步 ----
// 閘門 bbox x 345–905、y 0–440(t=3.6s 關門特寫);齒根 y=403、齒尖 y=440。
const GATE_PX = { w: 560, h: 440 };
const TEETH = {
  centers: [75, 212, 344, 476], // 齒中心(閘門左緣起算),兩側邊緣是缺口
  rootHalf: 34, // 齒根半寬
  tipHalf: 26, // 齒尖半寬(梯形,往下收窄)
  rootY: 403, // 齒根(px,影格 y 向下)
  tipY: 440, // 齒尖
};
const RACK_PX = { w: 560, h: 120 }; // rack.png 裁切區(t=5.2s,y 480 起)
// 齒條齒心在閘門齒的半距偏移處;齒尖在 crop 第 7 列(影格 y≈487,固定不動)
const RACK = { centers: [34, 148, 278, 407, 510], tipRow: 7, rootRow: 44 };
const RACK_TIP_FRAME_Y = 487; // 齒條齒尖的影格絕對 y(關門時與閘門齒尖 440 之間是暗縫)
const LEVER_SIGN = { w: 70, h: 30, x: 388, y: 194 }; // 影格絕對座標
const LEVER_BOX = { w: 110, h: 88, x: 382, y: 226 };
const GATE_X0 = 345; // 閘門左緣在影格上的 x

const DOOR_HEIGHT = 6; // 世界單位(可見高度)
const S = DOOR_HEIGHT / GATE_PX.h; // px → 世界單位
const PLATE_DEPTH = 26; // 鐵板厚度(px,擠出深度)——齒的內側面靠這個
const LIFT_WORLD = 5.4; // doorAngle=1 時的上升量(世界單位)

/** 影格絕對 px 矩形 → 閘門局部座標(px,閘門中心為原點,+y 向上) */
const rectToLocal = (r: { w: number; h: number; x: number; y: number }) => ({
  cx: r.x + r.w / 2 - GATE_X0 - GATE_PX.w / 2,
  cy: GATE_PX.h / 2 - (r.y + r.h / 2),
});

/** 閘門輪廓:矩形,底緣(齒根線)掛四個朝下的梯形齒 */
const buildGateShape = () => {
  const L = -GATE_PX.w / 2;
  const R = GATE_PX.w / 2;
  const T = GATE_PX.h / 2;
  const root = T - TEETH.rootY; // 齒根線
  const tip = T - TEETH.tipY; // 齒尖
  const shape = new THREE.Shape();
  shape.moveTo(L, T);
  shape.lineTo(R, T);
  shape.lineTo(R, root);
  // 底緣由右往左,遇齒往下畫梯形(根寬尖窄)
  for (const c of [...TEETH.centers].reverse()) {
    const cx = c - GATE_PX.w / 2;
    shape.lineTo(cx + TEETH.rootHalf, root);
    shape.lineTo(cx + TEETH.tipHalf, tip);
    shape.lineTo(cx - TEETH.tipHalf, tip);
    shape.lineTo(cx - TEETH.rootHalf, root);
  }
  shape.lineTo(L, root);
  shape.closePath();
  return shape;
};

/** 地面齒條:基座 + 頂緣五個朝上的梯形齒(在閘門齒的半距偏移處,座標對齊 rack.png) */
const buildRackShape = () => {
  const L = -RACK_PX.w / 2;
  const R = RACK_PX.w / 2;
  const base = -RACK_PX.h / 2;
  const rootLine = RACK_PX.h / 2 - RACK.rootRow;
  const tip = RACK_PX.h / 2 - RACK.tipRow;
  const shape = new THREE.Shape();
  shape.moveTo(L, base);
  shape.lineTo(L, rootLine);
  for (const c of RACK.centers) {
    const cx = c - RACK_PX.w / 2;
    shape.lineTo(cx - TEETH.rootHalf, rootLine);
    shape.lineTo(cx - TEETH.tipHalf, tip);
    shape.lineTo(cx + TEETH.tipHalf, tip);
    shape.lineTo(cx + TEETH.rootHalf, rootLine);
  }
  shape.lineTo(R, rootLine);
  shape.lineTo(R, base);
  shape.closePath();
  return shape;
};

/**
 * 載入裁切貼圖並設定 UV 轉換:ExtrudeGeometry 正面的 UV 就是輪廓座標(px),
 * repeat=1/尺寸、offset=0.5 讓 crop 影像剛好鋪滿輪廓 bbox。
 */
const useCropTexture = (file: string, wPx: number, hPx: number) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    const tex = new THREE.TextureLoader().load(
      `${TEX_BASE}/${file}`,
      () => {
        if (alive) setTexture(tex);
      },
      undefined,
      () => {
        console.warn(
          `[poc-b10] 貼圖載入失敗:${TEX_BASE}/${file}(先執行 scripts/poc/extract-b10-textures.sh?)`
        );
      }
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1 / wPx, 1 / hPx);
    tex.offset.set(0.5, 0.5);
    return () => {
      alive = false;
      setTexture(null);
      tex.dispose();
    };
  }, [file, wPx, hPx]);
  return texture;
};

/** 齒形擠出網格:正面貼裁切圖,側壁(含齒內側面)用暗鏽色 */
const ToothedPlate = ({
  shape,
  texture,
  fallback,
  sideColor,
}: {
  shape: THREE.Shape;
  texture: THREE.Texture | null;
  fallback: string;
  sideColor: string;
}) => {
  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth: PLATE_DEPTH,
        bevelEnabled: false,
      }),
    [shape]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0, -PLATE_DEPTH / 2]}>
      {/* key 強制換新材質:shader 需以 USE_MAP 重編譯,否則貼圖被忽略、color 重設為白 → 白模 */}
      <meshLambertMaterial
        key={texture ? "textured" : "flat"}
        attach="material-0"
        map={texture ?? undefined}
        color={texture ? undefined : fallback}
      />
      <meshLambertMaterial attach="material-1" color={sideColor} />
    </mesh>
  );
};

/** 警示牌/拉桿盒的貼圖:plane UV 是 0..1,直接載入不做 UV 轉換 */
const useFlatTexture = (file: string) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    const tex = new THREE.TextureLoader().load(
      `${TEX_BASE}/${file}`,
      () => {
        if (alive) setTexture(tex);
      },
      undefined,
      () => {
        console.warn(`[poc-b10] 貼圖載入失敗:${TEX_BASE}/${file}`);
      }
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    return () => {
      alive = false;
      setTexture(null);
      tex.dispose();
    };
  }, [file]);
  return texture;
};

const FlatReliefPart = ({
  rect,
  depth,
  file,
  sideColor,
}: {
  rect: { w: number; h: number; x: number; y: number };
  depth: number;
  file: string;
  sideColor: string;
}) => {
  const tex = useFlatTexture(file);
  const { cx, cy } = rectToLocal(rect);
  return (
    <group position={[cx, cy, PLATE_DEPTH / 2 + depth / 2]}>
      <mesh>
        <boxGeometry args={[rect.w, rect.h, depth]} />
        <meshLambertMaterial color={sideColor} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.5]}>
        <planeGeometry args={[rect.w, rect.h]} />
        <meshLambertMaterial
          key={tex ? "textured" : "flat"}
          map={tex ?? undefined}
          color={tex ? undefined : sideColor}
        />
      </mesh>
    </group>
  );
};

const B10Gate = ({ doorAngle }: { doorAngle: number }) => {
  const gateRef = useRef<THREE.Group>(null);
  const gateShape = useMemo(buildGateShape, []);
  const rackShape = useMemo(buildRackShape, []);
  const gateTex = useCropTexture("door.png", GATE_PX.w, GATE_PX.h);
  const rackTex = useCropTexture("rack.png", RACK_PX.w, RACK_PX.h);

  useFrame(() => {
    if (gateRef.current) {
      gateRef.current.position.y = doorAngle * (LIFT_WORLD / S); // px 空間
    }
  });

  // 齒條定位:齒尖固定在影格 y≈487(比閘門齒尖低 47px,關門時中間留暗縫,同原作)
  const rackY =
    GATE_PX.h / 2 - RACK_TIP_FRAME_Y - (RACK_PX.h / 2 - RACK.tipRow);

  return (
    <group scale={[S, S, S]}>
      {/* 閘門(垂直上升) */}
      <group ref={gateRef}>
        <ToothedPlate
          shape={gateShape}
          texture={gateTex}
          fallback="#4a3b32"
          sideColor="#33281f"
        />
        {/* 門上拉桿盒 + 黃色警示牌(跟著閘門一起升) */}
        <FlatReliefPart rect={LEVER_SIGN} depth={8} file="lever-sign.png" sideColor="#6b6428" />
        <FlatReliefPart rect={LEVER_BOX} depth={14} file="lever-box.png" sideColor="#3c3a2c" />
      </group>

      {/* 地面齒條(固定不動),稍微後移避免與閘門 z-fighting */}
      <group position={[0, rackY, -3]}>
        <ToothedPlate
          shape={rackShape}
          texture={rackTex}
          fallback="#3a2e26"
          sideColor="#241c16"
        />
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

const SewerGateB10 = () => {
  const config = getDoorAnimationConfig("direct-entry");
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

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const state = config.getState(easeInOutCubic(progress), {
    linearProgress: progress,
  });

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-xl font-bold">
          PoC:1-2 b10 下水道閘門(Shape 齒形擠出 + 垂直上升)
        </h1>
        <p className="text-sm text-white/60">
          驗證「齒緣閘門可用 ExtrudeGeometry 自組,齒有厚度、內側面可見,不需外找模型」。
          貼圖為遊戲截圖 placeholder(gitignored),正式版需替換為自製 / CC0 材質。
        </p>

        <div className="h-[520px] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <Canvas
            camera={{ position: [0, 0, 8], fov: 60 }}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <ambientLight intensity={0.3} />
            <directionalLight position={[1.5, 4, 5]} intensity={0.65} />
            <directionalLight position={[-3, 1, -4]} intensity={0.3} color="#8fa8c7" />
            <pointLight position={[0, -1, 3]} intensity={0.35} color="#c7b189" />
            <B10Gate doorAngle={state.doorAngle} />
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
            onClick={() => setProgress(0)}
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
            onChange={(e) => setProgress(Number(e.target.value))}
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

export default SewerGateB10;
