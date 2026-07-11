/**
 * PoC:1-2 b10 下水道閘門(Biohazard 2)
 *
 * 驗證目標:「齒緣垂直閘門」不需外找模型——齒形用 THREE.Shape 描 2D 輪廓
 * 再 ExtrudeGeometry 擠出厚度即可,齒的內側面天生存在(alpha 貼圖做不到的部分)。
 * 原作是上下顎式閘門:閉合時上下閘板齒形互鎖成一整片門板,
 * 開門時上閘板上升、下閘板等速下沉(影格逐格量測確認)。門上有拉桿盒,黑背景特寫。
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
// 上閘板 bbox x 345–905、y 0–440(t=3.6s 關門特寫);齒根 y=403、齒尖 y=440。
const GATE_PX = { w: 560, h: 440 };
const TEETH = {
  centers: [75, 212, 344, 476], // 齒中心(閘門左緣起算),兩側邊緣是缺口
  rootHalf: 34, // 齒根半寬
  tipHalf: 26, // 齒尖半寬(梯形,往下收窄)
  rootY: 403, // 齒根(px,影格 y 向下)
  tipY: 440, // 齒尖
};
const LOWER_PX = { w: 560, h: 315 }; // lower.png 裁切區(t=5.2s,y 485 起)
// 下閘板齒心在上閘板齒的半距偏移處;齒尖在 crop 第 2 列
const LOWER = { centers: [34, 148, 278, 407, 510], tipRow: 2, rootRow: 39 };
// 閉合時下閘板齒尖的影格絕對 y:互鎖到上閘板齒根(403)下緣,留 2px 縫
const LOWER_TIP_CLOSED_Y = 405;
const LEVER_SIGN = { w: 70, h: 30, x: 388, y: 194 }; // 影格絕對座標
const LEVER_BOX = { w: 110, h: 88, x: 382, y: 226 };
const GATE_X0 = 345; // 閘門左緣在影格上的 x

const DOOR_HEIGHT = 5; // 上閘板高度(世界單位)
const S = DOOR_HEIGHT / GATE_PX.h; // px → 世界單位
const PLATE_DEPTH = 26; // 鐵板厚度(px,擠出深度)——齒的內側面靠這個
const LIFT_WORLD = 5.4; // doorAngle=1 時上閘板上升量;下閘板等速反向下沉
// 閉合門板全高約影格 y 0–718;把內容中心(y≈360)移到鏡頭中心用的偏移
const ASSEMBLY_OFFSET_PX = 140;

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

/** 下閘板:板身 + 頂緣五個朝上的梯形齒(在上閘板齒的半距偏移處,座標對齊 lower.png) */
const buildLowerShape = () => {
  const L = -LOWER_PX.w / 2;
  const R = LOWER_PX.w / 2;
  const base = -LOWER_PX.h / 2;
  const rootLine = LOWER_PX.h / 2 - LOWER.rootRow;
  const tip = LOWER_PX.h / 2 - LOWER.tipRow;
  const shape = new THREE.Shape();
  shape.moveTo(L, base);
  shape.lineTo(L, rootLine);
  for (const c of LOWER.centers) {
    const cx = c - LOWER_PX.w / 2;
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
  // 材質整組用建構式重建、原子替換:
  // - keyed attach="material-0" 置換會讓材質陣列瞬間出現空洞而崩潰
  // - 命令式 m.map=... 又繞過建構期的 colorSpace 設定,顏色會洗白
  const materials = useMemo(
    () => [
      new THREE.MeshLambertMaterial(
        texture ? { map: texture } : { color: fallback }
      ),
      new THREE.MeshLambertMaterial({ color: sideColor }),
    ],
    [texture, fallback, sideColor]
  );
  useEffect(
    () => () => materials.forEach((m) => m.dispose()),
    [materials]
  );
  return (
    <mesh
      geometry={geometry}
      material={materials}
      position={[0, 0, -PLATE_DEPTH / 2]}
    />
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
  const lowerRef = useRef<THREE.Group>(null);
  const gateShape = useMemo(buildGateShape, []);
  const lowerShape = useMemo(buildLowerShape, []);
  const gateTex = useCropTexture("door.png", GATE_PX.w, GATE_PX.h);
  const lowerTex = useCropTexture("lower.png", LOWER_PX.w, LOWER_PX.h);

  // 下閘板閉合位置:齒尖(crop 第 2 列)對到影格 y=405,與上閘板齒互鎖
  const lowerClosedY =
    GATE_PX.h / 2 - LOWER_TIP_CLOSED_Y - (LOWER_PX.h / 2 - LOWER.tipRow);
  const travelPx = LIFT_WORLD / S;

  useFrame(() => {
    if (gateRef.current) {
      gateRef.current.position.y = doorAngle * travelPx; // px 空間
    }
    if (lowerRef.current) {
      lowerRef.current.position.y = lowerClosedY - doorAngle * travelPx;
    }
  });

  return (
    <group scale={[S, S, S]}>
      <group position={[0, ASSEMBLY_OFFSET_PX, 0]}>
        {/* 上閘板(上升) */}
        <group ref={gateRef}>
          <ToothedPlate
            shape={gateShape}
            texture={gateTex}
            fallback="#4a3b32"
            sideColor="#33281f"
          />
          {/* 門上拉桿盒 + 黃色警示牌(跟著上閘板一起升) */}
          <FlatReliefPart rect={LEVER_SIGN} depth={8} file="lever-sign.png" sideColor="#6b6428" />
          <FlatReliefPart rect={LEVER_BOX} depth={14} file="lever-box.png" sideColor="#3c3a2c" />
        </group>

        {/* 下閘板(下沉),稍微後移避免互鎖區 z-fighting */}
        <group ref={lowerRef} position={[0, lowerClosedY, -3]}>
          <ToothedPlate
            shape={lowerShape}
            texture={lowerTex}
            fallback="#3a2e26"
            sideColor="#241c16"
          />
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

  const state = config.getState(easeInOutCubic(progress), {
    linearProgress: progress,
  });

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-xl font-bold">
          PoC:1-2 b10 下水道閘門(Shape 齒形擠出 + 上下對開)
        </h1>
        <p className="text-sm text-white/60">
          驗證「齒緣閘門可用 ExtrudeGeometry 自組,齒有厚度、內側面可見,不需外找模型」。
          閉合時上下閘板齒形互鎖成一整片門板,開門時上升/下沉對拉(同原作)。
          貼圖為遊戲截圖 placeholder(gitignored),正式版需替換為自製 / CC0 材質。
        </p>

        <div className="h-[520px] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <Canvas
            camera={{ position: [0, 0, 8], fov: 60 }}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <ambientLight intensity={0.15} />
            <directionalLight position={[2, 5, 5]} intensity={0.4} />
            <directionalLight position={[-3, 2, -4]} intensity={0.2} color="#8fa8c7" />
            {/* 暖橘點光源壓色調,同 a11 的鏽紅氛圍;總光量壓在 1 以下維持底片感 */}
            <pointLight position={[0, 1, 3]} intensity={0.35} color="#ff8844" />
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

export default SewerGateB10;
