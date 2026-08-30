# Phase 1 Door Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Phase 1 door selection as released `retro-horror-door` presets, starting from the approved gallery/export list while keeping gallery classification records outside this repo.

**Architecture:** `packages/door-lib` owns only runtime-ready preset metadata, generated/compressed texture assets, renderer behavior, and tests. The canonical Phase 1 selection remains in the sibling `../re-door-gallery` repository and the reviewed export file; this plan stores the implementation backlog and verification workflow, not the classification source of truth.

**Tech Stack:** TypeScript, Three.js, Vite asset imports, WebP/PNG texture assets, Node test runner, Playwright browser tests

---

## Source And Rules

Canonical selection source used for this implementation plan:

- Local reviewed export: `/Users/mujingtsai/Downloads/door-selection-2026-08-25-first-bio123.json`
- Exported at: `2026-08-25T06:21:39.429Z`
- Selected doors: `35`
- Selected category pairs: `20`
- Constraint: no selected category should contain more than three doors.

Do not copy gallery source videos, frame grabs, report tables, classification CSVs, or gallery metadata into this repo. Generated runtime textures may live in `packages/door-lib/src/assets/textures/` when they are original runtime assets, not copied frames.

## Runtime Target Backlog

Use this backlog only as the Phase 1 implementation checklist. If the gallery/export changes, update the source there first, then revise this plan.

| Wave | Category | Source ids |
| --- | --- | --- |
| 1 | 鉸鏈單開 × 無配件 | `1-1/a01/a01-s1鐵門.mp4`, `1-2/a01/a01單門-無把手.mp4`, `1-3/a01/a01-s2停車場門.mp4` |
| 2 | 鉸鏈單開 × 喇叭鎖 | `1-1/a02/a02-s5黃目字門.mp4`, `1-2/a03/a03-s2目字門.mp4`, `1-3/a02/a02-s1 鐵窗門.mp4` |
| 3 | 鉸鏈單開 × 豎把 | `1-1/a03/a03-s2紅十字門.mp4`, `1-1/a03/a03-s4紅花紋門.mp4`, `1-3/a07/a12-s1鐵門.mp4` |
| 4 | 鉸鏈單開 × 橫把／推桿 | `1-3/a03/a03-s1目鐵門.mp4`, `1-3/a03/a03-s2鐵門.mp4` |
| 5 | 鉸鏈單開 × 彎把 | `1-1/a06/a05-s4黃目字門.mp4` |
| 6 | 鉸鏈單開 × 斜把 | `1-2/a05/05-s1通風鐵門.mp4` |
| 7 | 鉸鏈單開 × 圓環／轉輪 | `1-2/a08/a08-s1自動旋轉門把.mp4`, `1-2/a11/a11-s1重型水門.mp4`, `1-3/a04/a04-s1圓環把手.mp4` |
| 8 | 鉸鏈雙開 × 喇叭鎖 | `1-1/b02/b02-s3方塊門.mp4`, `1-2/b04/b04-s2下通風紅木門.mp4`, `1-3/b03/b03-s3時鐘塔大門.mp4` |
| 9 | 鉸鏈雙開 × 豎把 | `1-1/b03/b03-s1 曲線門.mp4`, `1-3/b02/b02-s1窗木門.mp4` |
| 10 | 鉸鏈雙開 × 橫把／推桿 | `1-1/b04/b04-s2 田字門.mp4` |
| 11 | 鉸鏈雙開 × 門栓鎖 | `1-1/b01/b01-s1鐵門.mp4` |
| 12 | 中分滑動(雙扇對開) × 自動（無配件） | `1-1/b07/b07-s1雙門自動門.mp4`, `1-2/b07/b07-s1大電梯門.mp4`, `1-3/b06/b06-s1處理廠電梯門.mp4` |
| 13 | 中分滑動(雙扇對開) × 豎把 | `1-2/b05/b05-s1纜車門1.mp4`, `1-2/b05/b05-s1纜車門2.mp4` |
| 14 | 中分滑動(雙扇對開) × 圓環／轉輪 | `1-2/b08/b08-s1列車門.mp4` |
| 15 | 水平滑動(單扇) × 無配件 | `1-2/a09/a09-列車門.mp4` |
| 16 | 水平滑動(單扇) × 豎把 | `1-3/a08/a08-s1電車門.mp4` |
| 17 | 水平滑動(單扇) × 橫把／推桿 | `1-3/a08/a08-s2電車車廂門.mp4` |
| 18 | 垂直移動/捲升 × 自動（無配件） | `1-2/a10/a10-s1實驗室.mp4` |
| 19 | 垂直移動/捲升 × 環境操作件 | `1-2/b10/b10-s1下水道閘門.mp4` |
| 20 | 折疊/摺疊壓縮 × 自動（無配件） | `1-2/a02/a02窄雙扇門公車門.mp4` |

## Implementation Status

| Source id | Runtime preset | Status |
| --- | --- | --- |
| `1-1/a01/a01-s1鐵門.mp4` | `biohazard-1996-a01-iron-door` | Implemented with left hinge and authored A01 front/back textures. |
| `1-2/a01/a01單門-無把手.mp4` | `biohazard-1998-a01-no-handle-door` | Implemented as the opposite-hand A01 preset: right hinge, mirrored texture mapping, shared runtime textures. |
| `1-3/a01/a01-s2停車場門.mp4` | TBD | Pending new runtime texture. |
| `1-1/a02/a02-s5黃目字門.mp4` | `biohazard-1996-a02-yellow-panel-knob-door` | Implemented with left hinge, authored A02 front/back WebP textures, and procedural `knob-round` hardware. |

## File Structure

- Modify: `packages/door-lib/src/core/types.ts`
  - Add only the motion, material, animation, and handle profile ids required by the next implemented wave.
- Modify: `packages/door-lib/src/core/presets.ts`
  - Register one released preset per implemented Phase 1 target.
- Modify: `packages/door-lib/src/assets/textures/index.ts`
  - Export runtime texture URLs for generated front/back/edge assets.
- Create: `packages/door-lib/src/assets/textures/<preset-id>-front.webp`
  - Runtime-compressed front texture.
- Create: `packages/door-lib/src/assets/textures/<preset-id>-back.webp`
  - Runtime-compressed back texture, authored so visible front/back handle positions are symmetrical.
- Modify: `packages/door-lib/src/vanilla.ts`
  - Add renderer behavior only when a new door motion or handle family cannot be expressed by existing renderer primitives.
- Modify: `packages/door-lib/src/core/__tests__/variants.test.ts`
  - Cover preset registration, selection, and filter behavior.
- Modify: `packages/door-lib/src/__tests__/package-boundary.test.ts`
  - Keep asset imports and package boundary checks aligned with new runtime assets.
- Modify: `packages/sample/src/pages/Index.tsx`
  - Only if the catalog needs display grouping or labels beyond the existing `doorEntrancePresets` registry flow.
- Modify: `docs/phase1-door-selection.md`
  - Track runtime implementation status only; do not paste canonical gallery tables.

## Task 1: Guard The Phase 1 Preset Backlog

**Files:**
- Modify: `packages/door-lib/src/core/__tests__/variants.test.ts`
- Modify: `docs/phase1-door-selection.md`

- [ ] **Step 1: Add tests for the currently implemented Phase 1 preset count**

Assert that `biohazard-1996-a01-iron-door` remains registered and that all registered Phase 1 presets have explicit `frontTextureUrl`, `backTextureUrl`, `motion`, `type`, `material`, and `animation`.

- [ ] **Step 2: Run the targeted core tests**

Run: `npm run test:lib:core`

Expected: pass before adding more presets.

- [ ] **Step 3: Update status docs**

Update `docs/phase1-door-selection.md` so it points to this plan for implementation sequencing and records only runtime status.

- [ ] **Step 4: Commit checkpoint**

```bash
git add packages/door-lib/src/core/__tests__/variants.test.ts docs/phase1-door-selection.md docs/superpowers/plans/2026-08-27-phase1-door-presets.md
git commit -m "docs: plan phase one door presets"
```

## Task 2: Finish Wave 1 Single-Hinge No-Accessory Doors

**Files:**
- Modify: `packages/door-lib/src/core/presets.ts`
- Modify: `packages/door-lib/src/assets/textures/index.ts`
- Create: `packages/door-lib/src/assets/textures/biohazard-1999-a01-parking-door-front.webp`
- Create: `packages/door-lib/src/assets/textures/biohazard-1999-a01-parking-door-back.webp`
- Modify: `packages/door-lib/src/core/__tests__/variants.test.ts`

- [ ] **Step 1: Write failing registry tests**

Add expected preset ids for:
- `biohazard-1998-a01-no-handle-door`
- `biohazard-1999-a01-parking-door`

Verify both use `type: "single"`, `motion: "hinge-single"`, no `handleProfileId`, and authored front/back textures.
For `biohazard-1998-a01-no-handle-door`, verify it shares the A01 runtime textures and uses `hingeSide: "right"` plus `mirrorTextureX: true`.

- [ ] **Step 2: Run the targeted test to verify failure**

Run: `npm run test:lib:core`

Expected: fail because the two new preset ids do not exist yet.

- [ ] **Step 3: Generate and compress runtime textures**

Create original runtime front/back images from the approved visual direction when the target is visually distinct. Compress to WebP before importing. Keep source masters only if they are still needed for active review. Reuse existing textures with preset-level mirror metadata when the target is the same door with the opposite hand.

- [ ] **Step 4: Register the presets**

Add the two presets to `packages/door-lib/src/core/presets.ts` and export their textures from `packages/door-lib/src/assets/textures/index.ts`.

- [ ] **Step 5: Re-run tests**

Run: `npm run test:lib:core`

Expected: pass.

- [ ] **Step 6: Visual check**

Run: `npm run dev`

Expected: sample catalog shows the three Wave 1 no-accessory doors through the actual mounted renderer. Confirm front/back texture orientation during playback.

- [ ] **Step 7: Commit checkpoint**

```bash
git add packages/door-lib/src/core/presets.ts packages/door-lib/src/assets/textures packages/door-lib/src/core/__tests__/variants.test.ts
git commit -m "feat: add phase one no-accessory doors"
```

## Task 3: Implement Single-Hinge Handle Families

**Files:**
- Modify: `packages/door-lib/src/core/types.ts`
- Modify: `packages/door-lib/src/core/presets.ts`
- Modify: `packages/door-lib/src/vanilla.ts`
- Modify: `packages/door-lib/src/handleModel.ts`
- Modify: `packages/door-lib/src/__tests__/handleModel.test.ts`
- Modify: `packages/door-lib/src/core/__tests__/variants.test.ts`
- Create: `packages/door-lib/src/assets/textures/<preset-id>-front.webp`
- Create: `packages/door-lib/src/assets/textures/<preset-id>-back.webp`

- [ ] **Step 1: Write handle-profile tests**

Cover required single-hinge accessory families: `喇叭鎖`, `豎把`, `橫把／推桿`, `彎把`, `斜把`, and `圓環／轉輪`.

- [ ] **Step 2: Run tests to verify missing profiles fail**

Run: `npm run test:lib:core`

Expected: fail for unimplemented profile ids or preset ids.

- [ ] **Step 3: Add minimal renderer support**

Extend existing handle placement/model logic only for accessory families that cannot reuse the current model. Keep the vanilla scene limited to door leaves and handles.

- [ ] **Step 4: Add presets and textures by category**

Implement Waves 2-7. Preserve authored front/back symmetry for every handle-bearing texture.

- [ ] **Step 5: Verify core and package tests**

Run: `npm run test:lib:core`
Run: `npm run test:lib:package`

Expected: both pass.

- [ ] **Step 6: Commit checkpoint**

```bash
git add packages/door-lib/src/core packages/door-lib/src/vanilla.ts packages/door-lib/src/handleModel.ts packages/door-lib/src/assets/textures packages/door-lib/src/__tests__
git commit -m "feat: add phase one single-hinge handle doors"
```

## Task 4: Implement Double-Hinge Door Presets

**Files:**
- Modify: `packages/door-lib/src/core/types.ts`
- Modify: `packages/door-lib/src/core/presets.ts`
- Modify: `packages/door-lib/src/vanilla.ts`
- Modify: `packages/door-lib/src/core/__tests__/variants.test.ts`
- Create: `packages/door-lib/src/assets/textures/<preset-id>-front.webp`
- Create: `packages/door-lib/src/assets/textures/<preset-id>-back.webp`

- [ ] **Step 1: Write failing tests for Waves 8-11**

Assert each double-hinge preset has `type: "double"` and `motion: "hinge-double"`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:lib:core`

Expected: fail because double-hinge Phase 1 presets are not registered.

- [ ] **Step 3: Add missing handle/lock support**

Implement only the handle families needed for double-hinge doors: `喇叭鎖`, `豎把`, `橫把／推桿`, and `門栓鎖`.

- [ ] **Step 4: Add presets and runtime textures**

Register Waves 8-11 and export their texture assets.

- [ ] **Step 5: Browser visual regression check**

Run: `npm run test:lib:browser`

Expected: pass existing catalog modal and playback coverage.

- [ ] **Step 6: Commit checkpoint**

```bash
git add packages/door-lib/src/core packages/door-lib/src/vanilla.ts packages/door-lib/src/assets/textures
git commit -m "feat: add phase one double-hinge doors"
```

## Task 5: Add Sliding, Vertical, And Folding Motions

**Files:**
- Modify: `packages/door-lib/src/core/types.ts`
- Modify: `packages/door-lib/src/core/animationState.ts`
- Modify: `packages/door-lib/src/core/__tests__/animation-state.test.ts`
- Modify: `packages/door-lib/src/core/presets.ts`
- Modify: `packages/door-lib/src/vanilla.ts`
- Modify: `packages/door-lib/src/core/__tests__/variants.test.ts`
- Create: `packages/door-lib/src/assets/textures/<preset-id>-front.webp`
- Create: `packages/door-lib/src/assets/textures/<preset-id>-back.webp`

- [ ] **Step 1: Write failing animation-state tests**

Cover motion families for:
- `中分滑動(雙扇對開)`
- `水平滑動(單扇)`
- `垂直移動/捲升`
- `折疊/摺疊壓縮`

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:lib:core`

Expected: fail for unsupported motion state.

- [ ] **Step 3: Implement minimal timeline states**

Add translation/folding state primitives while preserving the existing public API and random selection contract.

- [ ] **Step 4: Implement renderer motion**

Update `packages/door-lib/src/vanilla.ts` so the new animation states drive the existing door-leaf meshes or the smallest necessary leaf variants.

- [ ] **Step 5: Register Waves 12-20**

Add all sliding, vertical, and folding presets with their runtime textures.

- [ ] **Step 6: Verify full library behavior**

Run: `npm run test:lib:core`
Run: `npm run test:lib:package`
Run: `npm run test:lib:browser`

Expected: all pass.

- [ ] **Step 7: Commit checkpoint**

```bash
git add packages/door-lib/src/core packages/door-lib/src/vanilla.ts packages/door-lib/src/assets/textures
git commit -m "feat: add phase one non-hinge doors"
```

## Task 6: Final Sample And Release Verification

**Files:**
- Modify: `packages/sample/src/pages/Index.tsx` only if catalog grouping needs adjustment
- Modify: `docs/phase1-door-selection.md`

- [ ] **Step 1: Confirm catalog uses registry data**

Verify the sample home page renders from `doorEntrancePresets` and does not duplicate the Phase 1 registry.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no new errors. Existing Fast Refresh warnings are acceptable only if unrelated and already present.

- [ ] **Step 3: Run full build**

Run: `npm run build`

Expected: library and sample build successfully with all WebP assets copied.

- [ ] **Step 4: Run browser verification**

Run: `npm run verify:lib:browser`

Expected: core verification plus browser coverage pass.

- [ ] **Step 5: Manual visual QA**

Run: `npm run dev`

Expected:
- all Phase 1 presets appear in sample catalog
- each card preview uses `mountDoorEntrance`
- modal playback opens and closes correctly
- Play, Reset, seek, Escape close, overlay close, mobile close button, and sound gesture behavior still work
- front/back texture orientation is symmetrical for handle-bearing doors

- [ ] **Step 6: Update runtime status docs**

Update `docs/phase1-door-selection.md` with implemented preset ids and any deferred issues. Keep source-of-truth language pointing at `../re-door-gallery`.

- [ ] **Step 7: Final commit**

```bash
git add packages/sample/src/pages/Index.tsx docs/phase1-door-selection.md
git commit -m "docs: record phase one preset implementation status"
```
