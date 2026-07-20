# B06 Heavy Water Double-Door POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/poc/b06` feasibility page that applies the two approved original generated fronts to real two-leaf geometry, animates the valve and inward-opening hinges, and switches between normal and frozen materials without changing motion.

**Architecture:** Keep the POC inside `packages/sample/src/poc/` and leave `door-entrance` unchanged. Pure modules own immutable asset/crop contracts, motion state, resource ownership, and scene descriptors; one React Three Fiber page owns browser image loading, animation playback, variant selection, and rendering. B06 may copy proven lifecycle patterns from B05 but must remain specialized rather than introducing a generalized front-image framework.

**Tech Stack:** React 18, TypeScript, Three.js 0.133.1, React Three Fiber 8, Vite, Node's built-in test runner.

**Design reference:** `docs/superpowers/specs/2026-07-16-b06-heavy-water-double-door-design.md`

---

## File Map

- `packages/sample/public/textures/b06/normal.png`: approved original normal-metal complete door pair.
- `packages/sample/public/textures/b06/frozen.png`: approved original frozen variant with identical structure.
- `packages/sample/src/poc/b06Assets.ts`: asset identities, URLs, exact crops, leaf dimensions, hardware-cover measurements, and pure crop extraction.
- `packages/sample/src/poc/b06Assets.test.ts`: PNG identity, contract, URL, crop, orientation, and invalid-input tests.
- `packages/sample/src/poc/b06Motion.ts`: deterministic wheel, hinge, camera, and fade timeline.
- `packages/sample/src/poc/b06Motion.test.ts`: timing, symmetry, bounds, and non-finite input tests.
- `packages/sample/src/poc/b06FrontResources.ts`: specialized crop-to-texture/material pipeline and exactly-once resource ownership.
- `packages/sample/src/poc/b06FrontResources.test.ts`: rendering configuration, atomic construction, and disposal tests.
- `packages/sample/src/poc/b06FrontLoader.ts`: cancellable browser image load controller.
- `packages/sample/src/poc/b06FrontLoader.test.ts`: success, failure, processing exception, cancellation, and stale-load tests.
- `packages/sample/src/poc/b06Scene.ts`: pure two-leaf scene descriptors and geometry parentage.
- `packages/sample/src/poc/b06Scene.test.ts`: seam, hinge, front-plane, hardware-cover, and no-environment tests.
- `packages/sample/src/poc/HeavyWaterDoubleDoorB06.tsx`: R3F scene, resource effects, controls, and Normal/Frozen selector.
- `packages/sample/src/App.tsx`: `/poc/b06` route.
- `package.json`: `test:b06` command.

### Task 1: Lock The Approved Assets And Crop Contract

**Files:**
- Create: `packages/sample/public/textures/b06/normal.png`
- Create: `packages/sample/public/textures/b06/frozen.png`
- Create: `packages/sample/src/poc/b06Assets.ts`
- Create: `packages/sample/src/poc/b06Assets.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing asset identity and contract tests**

Create `b06Assets.test.ts` with Node `fs`, `crypto`, and `node:test`. Require:

```ts
assert.deepEqual(B06_FRONT_ASSETS.normal, {
  publicPath: "textures/b06/normal.png",
  width: 1586,
  height: 992,
  sha256: "a6a9c27a179d836a98f5b21ac9c43e20300e1c43bced2ec9f092fd8ac0157f04",
});
assert.deepEqual(B06_FRONT_ASSETS.frozen, {
  publicPath: "textures/b06/frozen.png",
  width: 1586,
  height: 992,
  sha256: "669cbc0e47df1adfdb3955fcc898f9ce322ea1651f88337d9f31dceeeeeeab3d",
});
assert.deepEqual(B06_FRONT_CROPS, {
  left: { x: 377, y: 35, width: 410, height: 930 },
  right: { x: 797, y: 35, width: 410, height: 930 },
});
assert.equal(B06_LEAF_HEIGHT, 6);
assert.equal(B06_LEAF_WIDTH, 6 * 410 / 930);
```

Read both PNGs from disk and assert PNG signature, IHDR `1586 x 992`, 8-bit RGB color type `2`, and exact SHA-256. Browser canvas decoding produces the RGBA buffers used by the crop pipeline; do not rewrite the approved PNGs merely to change their PNG color type. Test URL resolution with `/` and `/re-canvas-door-swing/`. Test crop endpoint bytes on a small synthetic RGBA source to prove left and right rows are copied in source order with no reversal or mutation. Reject incomplete RGBA sources, dimension mismatches, unsafe dimensions, and out-of-bounds crops.

- [ ] **Step 2: Add `test:b06` and run RED**

Add to root `package.json`:

```json
"test:b06": "node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b06Assets.test.ts packages/sample/src/poc/b06Motion.test.ts packages/sample/src/poc/b06FrontResources.test.ts packages/sample/src/poc/b06FrontLoader.test.ts packages/sample/src/poc/b06Scene.test.ts"
```

Run: `node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b06Assets.test.ts`

Expected: FAIL because `b06Assets.ts` and committed assets do not exist.

- [ ] **Step 3: Copy and verify the approved sources**

Copy without deleting the generated originals:

```bash
mkdir -p packages/sample/public/textures/b06
: "${B06_NORMAL_SOURCE:?set B06_NORMAL_SOURCE to the approved normal asset}"
: "${B06_FROZEN_SOURCE:?set B06_FROZEN_SOURCE to the approved frozen asset}"
cp "$B06_NORMAL_SOURCE" packages/sample/public/textures/b06/normal.png
cp "$B06_FROZEN_SOURCE" packages/sample/public/textures/b06/frozen.png
shasum -a 256 packages/sample/public/textures/b06/normal.png packages/sample/public/textures/b06/frozen.png
```

Expected hashes: the exact values in Step 1. Stop on any mismatch.

- [ ] **Step 4: Implement the immutable asset and crop module**

Implement frozen contracts, `resolveB06FrontUrl(baseUrl, variant)`, and `extractB06FrontCrop(source, sourceWidth, sourceHeight, crop)`. The extractor copies rows in source order and never edits alpha or reverses pixels. Export:

```ts
export type B06Variant = "normal" | "frozen";
export const B06_LEAF_HEIGHT = 6;
export const B06_LEAF_WIDTH = B06_LEAF_HEIGHT * 410 / 930;
export const B06_MEMBER_DEPTH = 0.18;
export const B06_WHEEL_COVER = Object.freeze({
  center: Object.freeze([200 / 930 * 6, 3 - 505 / 930 * 6, 0.16] as const),
  bakedRadiusPixels: 94,
  radius: 0.64,
  wheelRadius: 0.50,
});
export const B06_HANDLE = Object.freeze({
  cropCenter: Object.freeze([220, 505] as const),
  localCenter: Object.freeze([(220 - 410) / 930 * 6, 3 - 505 / 930 * 6, 0.18] as const),
  barSize: Object.freeze([28 / 930 * 6, 250 / 930 * 6, 0.16] as const),
  mountSize: Object.freeze([76 / 930 * 6, 54 / 930 * 6, 0.20] as const),
  mountOffsetY: 125 / 930 * 6,
});
```

- [ ] **Step 5: Run GREEN and commit**

Run: `node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b06Assets.test.ts`

Expected: PASS.

```bash
git add package.json packages/sample/public/textures/b06 packages/sample/src/poc/b06Assets.ts packages/sample/src/poc/b06Assets.test.ts
git commit -m "feat: add b06 approved front assets"
```

### Task 2: Define The Valve-First Double-Door Timeline

**Files:**
- Create: `packages/sample/src/poc/b06Motion.ts`
- Create: `packages/sample/src/poc/b06Motion.test.ts`

- [ ] **Step 1: Write failing timeline tests**

Require `getB06MotionState(progress)` to return:

```ts
type B06MotionState = Readonly<{
  progress: number;
  wheelAngle: number;
  leftAngle: number;
  rightAngle: number;
  cameraPosition: readonly [number, number, number];
  cameraTarget: readonly [number, number, number];
  fadeOut: number;
}>;
```

Test that at `0` every angle and fade is zero; at `0.18` the wheel has completed `-1.25 * Math.PI` while both leaves remain closed; opening begins after `0.20`; left/right angles are exact mirrored values; camera z remains at `8` until opening completes; fade begins after camera travel; all values finish at their exact endpoints at `1`. Clamp negative, greater-than-one, `NaN`, and infinities deterministically.

- [ ] **Step 2: Run RED**

Run: `node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b06Motion.test.ts`

Expected: FAIL because `b06Motion.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure timeline**

Use clamped smoothstep segments:

```ts
const WHEEL_START = 0.03;
const WHEEL_END = 0.18;
const OPEN_START = 0.20;
const OPEN_END = 0.65;
const CAMERA_END = 0.92;
export const B06_DURATION_MS = 6500;
export const B06_MAX_SWING_RADIANS = 85 * Math.PI / 180;
```

Open inward with `leftAngle = +swing` and `rightAngle = -swing`. Move camera from `[0, 0, 8]` to `[0, 0, -2.5]`, target `[0, 0, -3]`, then fade from `0.92` to `1`.

- [ ] **Step 4: Run GREEN and commit**

Run the focused test and `npm run test:b05` to ensure the independent timeline does not regress B05.

```bash
git add packages/sample/src/poc/b06Motion.ts packages/sample/src/poc/b06Motion.test.ts
git commit -m "feat: define b06 double-door motion"
```

### Task 3: Build Cancellable Opaque Front Resources

**Files:**
- Create: `packages/sample/src/poc/b06FrontResources.ts`
- Create: `packages/sample/src/poc/b06FrontResources.test.ts`
- Create: `packages/sample/src/poc/b06FrontLoader.ts`
- Create: `packages/sample/src/poc/b06FrontLoader.test.ts`

- [ ] **Step 1: Write failing resource tests**

Use structural fake textures and materials, following `b05FrontResources.test.ts`, but assert the B06 contract:

```ts
assert.deepEqual(B06_FRONT_RENDERING, {
  wrap: "clamp-to-edge",
  minFilter: "linear",
  magFilter: "linear",
  flipY: true,
  generateMipmaps: false,
  encoding: "srgb",
  color: 0xffffff,
  transparent: false,
  alphaTest: 0,
  depthTest: true,
  depthWrite: true,
  side: "front",
  toneMapped: false,
});
```

Pass a synthetic `1586 x 992` RGBA buffer with distinct endpoint pixels and verify two independent `410 x 930` canvases receive unchanged bytes in source order. Verify source alpha is not modified. Force exceptions at each texture/material creation point and assert every partial resource is disposed exactly once while the original build error is preserved.

- [ ] **Step 2: Write failing loader and complete variant-switch tests**

Inject a fake Image, resource builder, publish spy, and failure spy. Require handlers to be assigned before `src`; success publishes one atomic pair; image error and processing exceptions report once; cleanup clears handlers; cleanup before load prevents publication; a stale resource arriving after cancellation is disposed immediately; repeated cleanup is idempotent.

Add one end-to-end Normal-to-Frozen ownership test using two consecutive `startB06FrontLoad` calls: load and publish the normal pair, retain the original normal `onload` closure, clean up normal and verify its accepted pair is disposed exactly once, start frozen, invoke the retained stale normal closure and verify its newly built stale pair is rejected/disposed without publication, then load frozen and verify only the frozen pair is published and remains alive until frozen cleanup. This is the required generation-rejection and replacement-disposal proof for the page effect.

- [ ] **Step 3: Run RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b06FrontResources.test.ts packages/sample/src/poc/b06FrontLoader.test.ts
```

Expected: FAIL because both modules are absent.

- [ ] **Step 4: Implement the specialized resource pipeline**

Implement `buildB06FrontResources(sourcePixels, factories)` using only `extractB06FrontCrop`, exact contracts from `b06Assets.ts`, and opaque `MeshBasicMaterial`. Implement idempotent `disposeB06FrontResources` and `createB06FrontResourceController`. Add `buildB06FrontResourcesFromImage(image)` as the browser adapter that validates `naturalWidth/naturalHeight`, reads one source canvas, and creates two crop canvases.

Implement `startB06FrontLoad` like the hardened B05 loader, but make failure text and types B06-specific. Do not share or modify B05 code in this task.

- [ ] **Step 5: Run GREEN and commit**

Run focused resource/loader tests, then `npm run test:b05`.

```bash
git add packages/sample/src/poc/b06FrontResources.ts packages/sample/src/poc/b06FrontResources.test.ts packages/sample/src/poc/b06FrontLoader.ts packages/sample/src/poc/b06FrontLoader.test.ts
git commit -m "feat: manage b06 front resources"
```

### Task 4: Lock The Two-Leaf Scene Structure

**Files:**
- Create: `packages/sample/src/poc/b06Scene.ts`
- Create: `packages/sample/src/poc/b06Scene.test.ts`

- [ ] **Step 1: Write failing scene descriptor tests**

Require exactly two leaf descriptors and no environment collection. Assert:

- left hinge world x is `-B06_LEAF_WIDTH`, local leaf bounds are `0..+B06_LEAF_WIDTH`;
- right hinge world x is `+B06_LEAF_WIDTH`, local leaf bounds are `-B06_LEAF_WIDTH..0`;
- closed world bounds meet at x `0` within `1e-9`;
- front planes use `B06_LEAF_WIDTH x 6`, z ahead of the Box front, increasing-u orientation, and `parents: ["hinge", "leaf"]`;
- both variants produce identical geometry descriptors and differ only by material identity;
- wheel backing and wheel are left-leaf descendants at `B06_WHEEL_COVER.center`;
- baked wheel radius is locked at `94` source pixels (`94 / 930 * 6` world units), so backing radius `0.64` exceeds both that footprint and wheel radius `0.50`;
- right handle is a right-leaf descendant centered from source pixel `(220, 505)` at local `((220 - 410) / 930 * 6, 3 - 505 / 930 * 6, 0.18)`;
- handle bar size is `(28 / 930 * 6, 250 / 930 * 6, 0.16)`, mount size is `(76 / 930 * 6, 54 / 930 * 6, 0.20)`, and mount centers are offset vertically by `125 / 930 * 6`;
- no side post, threshold, floor, wall, doorway, or full-pair plane descriptor exists.

- [ ] **Step 2: Run RED**

Run: `node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b06Scene.test.ts`

Expected: FAIL because `b06Scene.ts` is absent.

- [ ] **Step 3: Implement immutable scene descriptors**

Return leaf-local Box, front-plane, and hardware descriptors. Keep material generic so Node tests do not import WebGL. Use no negative scale and no right-crop reversal. Export the measured wheel footprint and exact `B06_HANDLE` pixel-to-world contract from `b06Assets.ts`; construct the right handle from one bar and two mounts at those coordinates, over the baked handle, and keep it static relative to its leaf.

- [ ] **Step 4: Run GREEN and commit**

Run the scene test and the complete `npm run test:b06` suite.

```bash
git add packages/sample/src/poc/b06Scene.ts packages/sample/src/poc/b06Scene.test.ts
git commit -m "test: lock b06 scene structure"
```

### Task 5: Render The POC And Add The Route

**Files:**
- Create: `packages/sample/src/poc/HeavyWaterDoubleDoorB06.tsx`
- Modify: `packages/sample/src/App.tsx`

- [ ] **Step 1: Add the route and verify the expected compile failure**

Import `HeavyWaterDoubleDoorB06` and add:

```tsx
<Route path="/poc/b06" element={<HeavyWaterDoubleDoorB06 />} />
```

Run: `npm run build:sample`

Expected: FAIL because the component does not yet exist.

- [ ] **Step 2: Implement the page shell and controls**

Follow existing POC controls: Play, Reset, progress range, percent label, and a Normal/Frozen two-button selector. Variant changes update only `variant`; they must not call `setProgress` or restart playback. Use responsive black staging with no visible environment geometry.

- [ ] **Step 3: Implement browser resource ownership**

For the selected variant, resolve its local URL and start one cancellable B06 load inside `useEffect`. On variant change, increment a generation token, dispose the previous accepted pair, and publish only the current generation. On failure, warn once and keep a dark-metal procedural fallback. Never render a white material.

- [ ] **Step 4: Implement the Three.js leaves and hardware**

Render each leaf as one hinge group containing:

- one shallow BoxGeometry for depth, sides, and rear;
- one matching front plane using that leaf's generated crop material;
- left-only opaque circular backing plate plus animated 3D valve wheel;
- right-only low-poly vertical pull handle.

Use `useFrame` to apply `getB06MotionState(progress)` to both hinge refs and the wheel ref. Keep the front planes and all hardware inside their matching hinge groups. Add only ambient, directional, and restrained neutral point lighting.

- [ ] **Step 5: Implement camera and fade**

Reuse the camera-following fade-plane pattern from B05 so the camera cannot pass it. Camera position and target come only from the pure motion state.

- [ ] **Step 6: Run automated verification**

Run:

```bash
npm run test:b06
npm run test:b05
npm run test:c03
npm run lint
npm run build
git diff --check
```

Expected: all pass. Existing lint warnings must not increase; errors are blocking.

- [ ] **Step 7: Commit the integrated POC**

```bash
git add packages/sample/src/App.tsx packages/sample/src/poc/HeavyWaterDoubleDoorB06.tsx
git commit -m "feat: add b06 double-door poc"
```

### Task 6: Complete The Mandatory Visual Gate

**Files:**
- Verify: `packages/sample/src/poc/HeavyWaterDoubleDoorB06.tsx`
- Reference: `packages/sample/public/textures/b06/normal.png`
- Reference: `packages/sample/public/textures/b06/frozen.png`
- Temporary output: `/private/tmp/b06-visual-comparison/`

The final temporary directory contains exactly `normal-baseline.png`, `normal-render-0.png`, `normal-side-by-side.png`, `frozen-baseline.png`, `frozen-render-0.png`, `frozen-side-by-side.png`, `render-0.12.png`, `render-0.45.png`, and `render-0.85.png`. Do not commit these verification files.

- [ ] **Step 1: Start the development preview**

Run: `npm run dev -- --host 127.0.0.1`

Open `/poc/b06` at the reported port. Confirm both local assets return HTTP 200 and no game/gallery/external assets are requested.

- [ ] **Step 2: Capture normal-state comparison**

At progress `0`, capture the interactive scene and compare it side-by-side with `normal.png`. Require:

- exactly two leaves with a clean center seam;
- no full-pair plane or duplicate door layer;
- no black crop rectangle around either leaf;
- valve backing fully conceals the baked fixed spokes;
- front proportions are not stretched;
- no walls, side posts, threshold, or floor.

- [ ] **Step 3: Capture frozen-state comparison**

Switch to Frozen without changing progress and capture again. Confirm geometry, framing, wheel, handle, and seam do not move; only front weathering changes.

- [ ] **Step 4: Capture motion states**

Capture progress near `0.12`, `0.45`, and `0.85`. Confirm valve movement precedes opening, both leaves rotate inward symmetrically, fronts remain attached, side thickness is visible, no stationary image remains at the closed position, and the camera passes through the opening before fade.

- [ ] **Step 5: Inspect browser and production behavior**

Require zero browser console errors. Run:

```bash
npm run build
npm run preview --workspace door-entrance-sample -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/re-canvas-door-swing/poc/b06`. Verify both requests are HTTP 200 at `/re-canvas-door-swing/textures/b06/normal.png` and `/re-canvas-door-swing/textures/b06/frozen.png`, and production behavior matches development.

- [ ] **Step 6: Calibrate only evidence-backed visual mismatches**

If the visual gate exposes a mismatch, first add or tighten the relevant pure descriptor/motion test, then make the smallest correction. Re-run every command from Task 5 Step 6 after any correction.

- [ ] **Step 7: Record the POC conclusion without changing evaluation status**

Report whether the POC proves B06 feasible and give the observed incremental estimate over A11. Do not edit the evaluation CSV, classifications, report, or gallery until the user explicitly accepts the conclusion.

- [ ] **Step 8: Commit verified calibration changes if any**

```bash
git add package.json packages/sample/src/App.tsx packages/sample/src/poc/b06*.ts packages/sample/src/poc/HeavyWaterDoubleDoorB06.tsx packages/sample/public/textures/b06
git commit -m "fix: calibrate b06 poc visuals"
```

Skip this commit when visual verification requires no code changes.
