# C03 Lift Platform POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual-similarity-first Three.js POC for the `1-1 c03` lift platform so the original "model creation cost too high" assessment can be tested in the browser.

**Architecture:** Keep the experiment inside the sample app as `/poc/c03`; do not change the public `door-entrance` API. A pure motion module owns the far-close-far camera timeline, while a focused React Three Fiber page builds the platform from primitives and optionally loads local screenshot-derived texture crops. A shell extractor reads the ignored sibling gallery video and writes only to a gitignored sample texture directory.

> **Material revision (2026-07-13):** The screenshot-crop workflow described in
> Tasks 2, 4, and 5 was removed after the initial POC. The final implementation
> uses deterministic RGBA generators from `c03ProceduralMaterials.ts`; it does
> not load source-video pixels or external texture files. The design spec is the
> current source of truth for the material architecture.

**Tech Stack:** React 18, TypeScript, React Three Fiber, Three.js, Node test runner, ffmpeg, Vite, Tailwind CSS.

---

## File Map

- Create `packages/sample/src/poc/c03Motion.ts`: pure clamped camera timeline and duration.
- Create `packages/sample/src/poc/c03Motion.test.ts`: Node tests for timeline bounds and far-close-far behavior.
- Create `packages/sample/src/poc/LiftPlatformC03.tsx`: POC geometry, local texture fallback, playback controls, and camera rig.
- Create `scripts/poc/extract-c03-textures.sh`: extract local evidence textures from source-video timestamps 22s and 27s.
- Modify `packages/sample/src/App.tsx`: register `/poc/c03`.
- Modify `.gitignore`: exclude `packages/sample/public/textures/poc-c03/`.
- Modify root `package.json`: add the focused `test:c03` command.

### Task 1: Camera Timeline

**Files:**
- Create: `packages/sample/src/poc/c03Motion.test.ts`
- Create: `packages/sample/src/poc/c03Motion.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing motion tests**

Cover progress clamping, matching start/end far distances, a closer midpoint, and finite camera/target values. Use `node:test` and `node:assert/strict`; import `getC03MotionState` from `./c03Motion.ts`. Add the exact root script `"test:c03": "node --experimental-strip-types --test packages/sample/src/poc/c03Motion.test.ts"` for the repository's Node 22 runtime.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test packages/sample/src/poc/c03Motion.test.ts`

Expected: FAIL because `c03Motion.ts` does not exist.

- [ ] **Step 3: Implement the minimal timeline**

Export `C03_DURATION_MS = 6500` and `getC03MotionState(progress)`. Clamp progress to `[0, 1]`, ease each segment with cubic smoothstep, and interpolate these measured-equivalent keyframes:

```ts
const keyframes = [
  { progress: 0, position: [-5.8, 6.8, 10.5], target: [0, 0, 0] },
  { progress: 0.22, position: [-3.4, 5.1, 7.2], target: [0, 0, 0] },
  { progress: 0.5, position: [-1.5, 4.4, 4.3], target: [0.1, 0, 0] },
  { progress: 0.78, position: [2.8, 5.4, 7.8], target: [0, 0, 0] },
  { progress: 1, position: [5.8, 6.8, 10.5], target: [0, 0, 0] },
];
```

Return only `cameraPosition` and `cameraTarget`. Keep the platform group static; the camera path alone must reproduce the source's changing screen angle.

- [ ] **Step 4: Run the focused test**

Run: `npm run test:c03`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json packages/sample/src/poc/c03Motion.ts packages/sample/src/poc/c03Motion.test.ts
git commit -m "test: define c03 platform motion"
```

### Task 2: Local Evidence Texture Pipeline

**Files:**
- Create: `scripts/poc/extract-c03-textures.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Add the ignored output path**

Ignore `packages/sample/public/textures/poc-c03/` beside the existing A11 and B10 POC entries.

- [ ] **Step 2: Add the extractor**

Resolve the source as:

```sh
GALLERY_ROOT="${DOOR_GALLERY_ROOT:-$ROOT/../re-door-gallery}"
VIDEO="${C03_VIDEO:-$GALLERY_ROOT/materials/door-transitions/1-1/c03/c03-s1升降梯.mp4}"
```

Extract brightness-corrected 1280x800 temporary frames at 22s and 27s inside `mktemp -d` using `eq=brightness=0.09:contrast=1.15:gamma=1.5`; do not copy those full frames into the output directory. Produce exactly five output files with these initial crop rectangles:

- `rust.png` from the 22s frame: `256:128:110:560`;
- `grid.png` from the 22s frame: `512:256:330:390`;
- `plate-left.png` from the 22s frame: `260:180:350:100`;
- `plate-right.png` from the 22s frame: `360:170:625:180`;
- `controller.png` from the 27s frame: `96:144:440:40`.

Record the same dimensions in comments next to matching geometry. If visual tuning changes a crop, update both the script comment and component source comment together.

- [ ] **Step 3: Run the extractor against the actual gallery checkout**

Run: `DOOR_GALLERY_ROOT=/Users/mujingtsai/Case/BioHazard/re-door-gallery scripts/poc/extract-c03-textures.sh`

Expected: five PNG files under `packages/sample/public/textures/poc-c03/`.

- [ ] **Step 4: Verify asset isolation**

Run: `git check-ignore packages/sample/public/textures/poc-c03/*.png`

Expected: every generated texture path is printed; `git status --short` shows only the script and `.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore scripts/poc/extract-c03-textures.sh
git commit -m "chore: add c03 poc texture extractor"
```

### Task 3: Hybrid 3D Platform Page

**Files:**
- Create: `packages/sample/src/poc/LiftPlatformC03.tsx`
- Modify: `packages/sample/src/App.tsx`

- [ ] **Step 1: Add the route before implementation**

Import `LiftPlatformC03` and register `<Route path="/poc/c03" element={<LiftPlatformC03 />} />` above the catch-all route.

- [ ] **Step 2: Confirm the route fails to build**

Run: `npm run build:sample`

Expected: FAIL because `LiftPlatformC03.tsx` does not exist.

- [ ] **Step 3: Build the platform silhouette**

Create focused components for textured boxes, railing segments, controller, platform assembly, and camera rig. Use primitives only:

- four shallow frame boxes around a `5.4 x 4.1` floor;
- a double-sided floor plane with the grid texture, alpha test, and dark fallback;
- two raised plate boxes across the rear edge;
- box or cylinder railing segments at approximately `1.8` world units above the floor, including the controller-side bent silhouette as multiple angled segments rather than one straight bar;
- a narrow controller box with three circular lamp/button faces.

Load each optional texture with a hook that keeps a colored fallback until `TextureLoader` succeeds and disposes it on unmount. The sample uses Three.js r133, so set `texture.encoding = THREE.sRGBEncoding` rather than the newer `SRGBColorSpace` API. Use nearest-neighbor filtering for the PSX look and repeat/wrap only where needed.

- [ ] **Step 4: Add animation and controls**

Drive `getC03MotionState(progress)` from a requestAnimationFrame loop. Add play, reset, and range input controls matching the existing POC pages. The `CameraRig` applies both camera position and target each frame while the platform stays static. Render against pure black with restrained warm/cool lighting.

- [ ] **Step 5: Verify fallback and textured builds**

Run `npm run lint` and `npm run build` before and after generating the local textures. Before extraction, open `/poc/c03` in the browser to verify colored fallbacks render without errors. After extraction, inspect the textured route, then temporarily move `packages/sample/public/textures/poc-c03/` to `/tmp` and reload the route to verify the runtime fallback before restoring the directory.

Expected: both commands pass in both states; the production build removes all `dist/textures/poc-*` directories.

- [ ] **Step 6: Commit**

```bash
git add packages/sample/src/App.tsx packages/sample/src/poc/LiftPlatformC03.tsx
git commit -m "feat: add c03 lift platform poc"
```

### Task 4: Browser Visual Review

**Files:**
- Modify if tuning is required: `packages/sample/src/poc/c03Motion.ts`
- Modify if tuning is required: `packages/sample/src/poc/LiftPlatformC03.tsx`

- [ ] **Step 1: Start the sample app**

Run: `npm run dev`

Open: `http://127.0.0.1:8080/poc/c03` or the port reported by Vite.

- [ ] **Step 2: Capture comparison frames**

Capture the POC at far, close, and exit positions at both desktop and mobile viewport widths. Compare the desktop frames in the browser companion against source frames at 22s and 27s; confirm the mobile layout keeps the canvas and controls usable. Then drag the scrubber continuously from 0% to 100% and back to catch intermediate clipping, alpha, and camera-path defects that the three captures may miss.

- [ ] **Step 3: Tune only decision-relevant differences**

Adjust silhouette proportions, camera keyframes, alpha threshold, or controller placement. Do not add environment, characters, audio, a reusable library preset, or distributable final textures.

- [ ] **Step 4: Run final verification**

Run: `npm run test:c03`, `npm run lint`, `npm run build`, `git diff --check`, and `git status --short`.

Expected: tests, lint, and build pass; no generated texture or source-video path is tracked.

- [ ] **Step 5: Record the measured outcome**

Report whether the POC supports the original `cannot do` assessment, a conditional feasibility verdict, or a production estimate. Do not edit the gallery evaluation until the visual result has been reviewed.
