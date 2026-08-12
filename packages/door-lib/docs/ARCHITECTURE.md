# Loading Door Module Architecture (Resident-Evil-style)

目的：在網站載入時隨機挑一種開門 / 轉場動畫播放，動畫結束後進入主站內容。強調關注點分離、可擴充、可控素材規格與效能。

## 現況與定位
- Monorepo：`packages/door-lib`（可重用庫）+ `packages/sample`（示範站）。
- 已有兩種動畫（direct-entry、top-down-entry），以 `DoorAnimationConfig`（時間軸 → state）驅動 React 元件 `DoorEntrance`。
- 目標：支援多動畫檔案、可插拔資產（門/把手/材質），未來可加入更複雜的 transition（階梯、雙門等）。

## 核心設計原則
1) **Animation Type ≠ Door/Handle 外觀**：動畫只描述「怎麼動」，素材（模型/貼圖/音效）用參數或資產清單注入。
2) **單一介面 / 契約**：所有動畫遵守同一介面，picker、preload、fallback 一次實作。
3) **資產可預載、可降級**：素材列表明確可測量；可根據網速/裝置降級。
4) **Deterministic Random（可選）**：支援 seed，方便重現隨機結果。

## 檔案與資料夾（建議映射到現有結構）
```
packages/door-lib/
  src/core/
    animationState.ts         # framework-free timeline -> state configs
    controller.ts             # framework-free playback lifecycle
    presets.ts                # framework-free preset metadata
    types.ts                  # shared vanilla/core types
  src/module/
    DoorEntrance.tsx          # React adapter component
    animations/               # 每個動畫獨立目錄 (config + renderer)
      direct-entry/
        index.tsx
      top-down-entry/
        index.tsx
      double-swing/
        index.tsx
      animation.template.ts   # 新動畫 scaffold
      index.ts                # 蒐集/匯出 configs + renderers
      shared.ts               # 共用 easing/clamp/lerp
    types.ts                  # React-facing 型別 + variant union
    vanilla.tsx               # legacy React-backed mount helper for the React module surface
  src/index.ts                # default public entry; React-free vanilla API + core exports
  src/vanilla.ts              # React-free vanilla mount API + Three.js renderer
  src/react.ts                # React adapter public entry (`retro-horror-door/react`)
  templates/                  # 額外 scaffold（保留）
  docs/ARCHITECTURE.md        # 本檔
```
> 後續若要引入更高階的「動畫模組契約」（preload/mount/play/unmount），可放在 `src/module/core/`，並讓 `DoorEntrance` 只當 adapter。

## 介面（兩層）
### 1) 目前的簡化契約（已實作）
```ts
// src/module/types.ts
export type DoorAnimationVariant = "direct-entry" | "top-down-entry" | ...;
export interface DoorAnimationState {
  doorAngle: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fadeOut: number;
}
export interface DoorAnimationConfig {
  id: DoorAnimationVariant;
  duration: number;
  progressMarkers: number[];
  easing?: (t: number) => number;
  getState: (progress: number) => DoorAnimationState;
}
```
- 目標契約：`DoorEntrance` 與 React-free `vanilla` renderer 應只依賴這層，適合時間軸驅動的開門動畫。
- 目前狀態：`retro-horror-door` 預設匯出 DOM + Three.js 的 vanilla renderer；`retro-horror-door/vanilla` 保留為相容別名。兩者都不透過 React、React DOM 或 R3F 掛載；React support 應留在 `retro-horror-door/react` adapter surface。

### 2) 擴充版契約（預留，未接線）
適用你列出的「singleSwing / doubleSwing / stairTransition…」：
```ts
export type AnimationKind =
  | "singleSwing" | "singleNoHandle" | "singleLockOrLatch" | "singleAuto"
  | "doubleSwing" | "doubleLockOrAuto"
  | "stairTransition" | "ladderTransition";

export type AnimationAssets = {
  door?: THREE.Object3D;
  handle?: THREE.Object3D;
  textures?: Record<string, THREE.Texture>;
};

export type AnimationParams = {
  openDirection?: "push" | "pull";
  hingeSide?: "left" | "right";
  handleProfile?: "long" | "ring" | "none";
  hasLock?: boolean;
  timing?: { totalMs: number };
};

export type AnimationContext = {
  now: () => number;
  scheduler: { onTick(cb: (t: number) => void): () => void };
  three: { scene: THREE.Scene; camera: THREE.Camera; renderer: THREE.WebGLRenderer };
  audio?: { play(name: string): void };
  debug?: { log: (...args: any[]) => void };
};

export type AnimationModule = {
  kind: AnimationKind;
  preload?: (ctx: AnimationContext) => Promise<void>;
  mount: (ctx: AnimationContext, assets: AnimationAssets, params: AnimationParams) => void;
  play: (ctx: AnimationContext, params: AnimationParams) => Promise<void>;
  unmount: (ctx: AnimationContext) => void;
};
```
- 若導入此層，可用 adapter 把 `AnimationModule` 包成現有的 `DoorAnimationConfig` 或直接讓 `DoorEntrance` 認得 `AnimationModule`。

## 新增動畫的操作流程
1) **複製 scaffold**：`src/module/animations/animation.template.ts` → 改檔名（例 `doubleSwing.ts`），填入 `id/label/description/duration/getState`。
2) **登錄**：在 `src/module/animations/index.ts` import 並 push 到 `doorAnimationConfigs`；在 `types.ts` 的 `DoorAnimationVariant` union 加上新 id。
3) **素材差異**：若需要不同門面/把手，透過 `DoorEntrance` 的 `textureUrl` prop 或未來的資產注入（可擴充 props）。
4) **隨機/Seed**：在 sample 或呼叫端寫一個 picker（如 `pickVariant(seed?, blacklist?)`），選完 variant 後塞給 `DoorEntrance`。

## 資產與效能建議
- 紋理：優先使用壓縮圖（webp/avif），目標單張 <300KB；模型用低 poly glTF/GLB。
- 預載：在進入門動畫前，先用 TextureLoader/GLTFLoader 預取並快取；失敗時 fallback 到簡化貼圖或純色材質。
- 時間：單段動畫建議 4–7 秒，結尾可用 `fadeOut` 遮罩與主站銜接。

## Testing Strategy
The library is guarded by layered tests so the core animation contract can stay
vanilla-first while React integration evolves separately.

### Core Tests
Run `npm run test:lib:core` to cover framework-free behavior: animation state,
presets, sound scheduling, and controller lifecycle logic. These tests should
not require React, React DOM, R3F, or a browser runtime.

`npm run verify:lib` and `npm run verify:lib:core` currently run the green core
verification path: library typecheck, library build, and core tests.

### Package Boundary Tests
Run `npm run test:lib:package` to build the package and inspect the published
entrypoints. The boundary tests protect the public export surface and require
the default `retro-horror-door` entry plus `retro-horror-door/vanilla` output graphs to
stay React-free.

`npm run verify:lib:boundary` currently runs this package-boundary layer and
must stay green. A failure here means the vanilla package output has regressed
by pulling React, React DOM, or R3F back into the vanilla graph.
React-related peer dependencies must remain optional so vanilla consumers only
need the framework-free dependency set.

### Browser Smoke Tests
Run `npm run test:lib:browser` to exercise the plain HTML sample in a browser:
the vanilla sample must mount, render a canvas, respond to controls, and clean
up through its lifecycle.

`npm run verify:lib:browser` runs the core verification path first, then the
browser smoke tests. It requires local dev server binding and an installed
Playwright browser runtime.

### React Adapter Tests
Vanilla tests must not require React. React support should be tested in a
separate layer when a React adapter exists, so failures in React-specific
mounting or R3F behavior do not weaken the vanilla boundary signal.

## 待辦 / 下一步（可選）
- 實作 `AnimationModule` adapter，讓 `DoorEntrance` 可以同時吃老式 `DoorAnimationConfig` 與新式 `AnimationModule`。
- 建立 `assets/manifest.ts`（列出門/把手/音效 URL + 尺寸）與 `ASSET_SPEC.md`（給美術的素材規格）。
- 加入 `scheduler.ts`（統一 raf/timeline）與 `random.ts`（seeded random + no-repeat）。
