# Loading Door Module Architecture (Resident-Evil-style)

目的：在網站載入時隨機挑一種開門 / 轉場動畫播放，動畫結束後進入主站內容。強調關注點分離、可擴充、可控素材規格與效能。

## 現況與定位
- Monorepo：`packages/door-lib`（可重用庫）+ `packages/sample`（示範站）。
- 已有三種動畫（direct-entry、single-top-down-entry、double-swing），以 `DoorAnimationConfig`（時間軸 → state）驅動 framework-free vanilla renderer。
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
    presets.ts                # framework-free playable preset registry
    types.ts                  # shared vanilla/core types
  src/index.ts                # default public entry; React-free vanilla API + core exports
  src/vanilla.ts              # React-free vanilla mount API + Three.js renderer
  docs/ARCHITECTURE.md        # 本檔
```
> 未來需要 React 時，另以 `src/core/` 與 `src/vanilla.ts` 的穩定契約建立獨立 adapter；它不應重新進入預設 package entry。

## 公開契約
```ts
// src/core/types.ts
export type DoorAnimationId = "direct-entry" | "top-down-entry" | ...;
export interface DoorAnimationState {
  doorAngle: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fadeOut: number;
}
export interface DoorAnimationConfig {
  id: DoorAnimationId;
  duration: number;
  progressMarkers: number[];
  easing?: (t: number) => number;
  getState: (progress: number) => DoorAnimationState;
}
```
- 目標契約：core 與 React-free `vanilla` renderer 只依賴這層，適合時間軸驅動的開門動畫。
- 目前狀態：`retro-horror-door` 預設匯出 DOM + Three.js 的 vanilla renderer；`retro-horror-door/vanilla` 保留為相容別名。兩者都不透過 React、React DOM 或 R3F 掛載。
- 公開選門 API 使用 `preset`，例如 `biohazard-1996-a01-iron-door`。一個 preset 是可播放的完整門組合，內部固定 `type`、`motion`、`handleProfileId`、`material`、animation config、聲音與鏡頭行為。
- 每個 runtime preset 可指定 `frontTextureUrl`、`edgeTextureUrl`、`backTextureUrl`。未指定側邊或背面時，renderer 會使用正面貼圖；`textureUrl` 僅保留給舊版相容，等同三個面皆使用同一張圖。這些欄位屬於 preset，不提供新的 per-mount 客製欄位。
- `random: true` 只從可用 runtime presets 中挑選；`type`、`motion`、`handle`、`material` 只在 random mode 作為篩選條件。有明確 `preset` 時不能再混用這些欄位。
- Runtime preset registry 不包含來源影片、縮圖或分類筆記。這些只存在於 Notion / gallery / dev tracking metadata，不能進 npm package。

## Sample catalog

- `packages/sample` 的 `/` 是目前的 preset catalog，不再是 PoC 導覽頁。
- 每張卡由 `PresetAnimationPreview.tsx` 以同一個 `mountDoorEntrance` renderer
  畫出 progress `0` 的真實門板初始畫面；不可用另外維護的靜態縮圖取代。
- 選擇卡片後，`PresetDetailModal.tsx` 會在 modal 內重新 mount 同一個 preset，
  提供播放、重設、時間軸 seek、音效與呼叫範例。這不是捲動到頁面下方的 detail
  section。
- 歷史 PoC 集中在 `/poc` 與其子路徑，保留作技術實驗，不代表已發布的 runtime preset。

## 新增動畫的操作流程
1) **新增 timeline config**：在 `src/core/animationState.ts` 新增 `id`、`label`、`description`、`duration` 與 `getState`。
2) **登錄**：將 config 加入 `doorAnimationConfigs`，並在 `src/core/types.ts` 的 `DoorAnimationId` union 加上新 id；需要不同幾何時，再擴充 `src/vanilla.ts` 的 scene builder。
3) **素材差異**：新增 project-owned 或 generated asset，掛到新的 runtime preset；不要讓 runtime registry 指向來源影片、擷取影格或 gallery thumbnails。
4) **隨機**：由 library 從 `doorEntrancePresets` 中挑選。呼叫端只能用 `random: true` 搭配分類 filter，不直接任意組合動畫、配件與材質。

## 資產與效能建議
- 紋理：優先使用壓縮圖（webp/avif），目標單張 <300KB；模型用低 poly glTF/GLB。
- 預載：在進入門動畫前，先用 TextureLoader 預取並快取；失敗時 fallback 到簡化貼圖或純色材質。
- 時間：單段動畫建議 4–7 秒，結尾可用 `fadeOut` 遮罩與主站銜接。

## Testing Strategy
The library is guarded by layered tests around its vanilla-only public contract.

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
The library manifest must not expose React-related peer dependencies or a
`retro-horror-door/react` package export.

### Browser Smoke Tests
Run `npm run test:lib:browser` to exercise both vanilla surfaces in a browser:
the plain HTML sample must mount and clean up, while the preset catalog must
render real canvas previews, open and close its detail modal, support timeline
seeking, unlock sound from the Play gesture, and keep the mobile close control
inside the viewport.

`npm run verify:lib:browser` runs the core verification path first, then the
browser smoke tests. It requires local dev server binding and an installed
Playwright browser runtime.

## 待辦 / 下一步（可選）
- 需要 React 時，建立獨立的 `retro-horror-door/react` adapter package，並維持預設 entry 與核心不依賴 React。
- 建立 `assets/manifest.ts`（列出門/把手/音效 URL + 尺寸）與 `ASSET_SPEC.md`（給美術的素材規格）。
- 加入 `scheduler.ts`（統一 raf/timeline）與 `random.ts`（seeded random + no-repeat）。
