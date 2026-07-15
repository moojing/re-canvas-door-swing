# B05 Reference-Inspired Material Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the B05 color-only aged iron with synchronized original procedural color and roughness maps matching the approved mood, and render only the two gate leaves.

**Architecture:** A pure TypeScript paired-map generator samples one corrosion feature record per pixel and derives both RGBA outputs in the same loop. The React Three Fiber page converts those buffers into one shared color texture, one shared roughness texture, and one shared material per mounted gate, while preserving the existing geometry, animation, lighting, and black environment.

**Tech Stack:** TypeScript, Node test runner, React 18, React Three Fiber, Three.js 0.133.1, Vite.

---

### Task 1: Generate synchronized color and roughness maps

**Files:**
- Modify: `packages/sample/src/poc/b05ProceduralMaterials.test.ts`
- Modify: `packages/sample/src/poc/b05ProceduralMaterials.ts`

- [ ] **Step 1: Write failing paired-map tests**

Import `createAgedIronMaterialPixels` and `validateAgedIronInput`. Add tests that require:

- paired `colorPixels` and `roughnessPixels` buffers with exact `width * height * 4` lengths;
- deterministic output for one seed and different output for another seed, including high seed bits;
- alpha `255` for both maps and equal RGB channels in every roughness pixel;
- a meaningful roughness range that remains above fully glossy values;
- generated charcoal pit pixels (stable non-overlapping RGB predicate) to have roughness bytes `>= 225`, generated worn-scratch pixels (separate stable RGB predicate) to have roughness bytes `140..190`, at least one pixel of each class in the fixed fixture, and mean pit roughness at least `40` bytes above mean scratch roughness;
- the compatibility `createAgedIronPixels` output to equal `createAgedIronMaterialPixels(...).colorPixels`;
- shared validation for safe integer dimensions, safe integer seed, pixel count `2..16_777_216`, and `RangeError` for invalid inputs. Exercise minimum accepted dimensions and every invalid case through both public generators. Exercise the exact maximum accepted and first rejected pixel counts through `validateAgedIronInput` without allocating two 64 MB buffers; also inspect that both generators call the validator before their first allocation.

Use stable semantic color ranges rather than a single implementation checksum for the alignment assertion. Require at least one pit and one scratch for the fixed `128 x 128`, seed `51` fixture.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b05ProceduralMaterials.test.ts
```

Expected: FAIL because the paired-map API and exported validator do not exist.

- [ ] **Step 3: Implement one shared corrosion feature pipeline**

Export:

```ts
interface AgedIronMaterialPixels {
  colorPixels: Uint8ClampedArray;
  roughnessPixels: Uint8ClampedArray;
}

export const validateAgedIronInput = (
  width: number,
  height: number,
  seed: number,
): void => { /* shared bounds */ };

export const createAgedIronMaterialPixels = (
  width: number,
  height: number,
  seed: number,
): AgedIronMaterialPixels => { /* paired loop */ };
```

For each pixel, calculate one internal feature record containing coarse oxidation, sparse patina, fine grain, pit, and scratch values. Derive both maps from that record in the same loop:

- color: dark wine-red/brown base, broad muted ochre oxidation, sparse gray-green patina, charcoal pits, restrained worn scratches;
- roughness: rust/patina/pits in the matte range, base iron moderately rough, scratches smoother but never glossy;
- roughness RGBA stores the same grayscale byte in R/G/B and alpha `255`.

Keep `createAgedIronPixels` as a compatibility wrapper returning the paired API's `colorPixels`. Retain deterministic contrast repair without allowing it to desynchronize the roughness pixel at repaired pit/scratch locations.

All noise functions, scales, thresholds, feature locations, repair positions, and palette constants must be independently authored from generic color-direction requirements. Do not sample, trace, preprocess, encode, or derive any pixel, mask, coordinate, noise field, threshold, constant, palette, or pattern from the supplied source image or generated mockup.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm run test:b05
npm run lint
git diff --check
```

Expected: B05 tests pass, lint has no errors, and diff check exits zero.

Commit:

```bash
git add packages/sample/src/poc/b05ProceduralMaterials.ts packages/sample/src/poc/b05ProceduralMaterials.test.ts
git commit -m "feat: generate b05 color and roughness maps"
```

### Task 2: Share one material across a gate-only scene

**Files:**
- Modify: `packages/sample/src/poc/ArchedGateB05.tsx`

- [ ] **Step 1: Replace color-only texture creation with owned resources**

Create a lazy per-gate resource object containing:

- two independent `128 x 128` canvases and `ImageData` objects populated from the paired RGBA buffers;
- a color `CanvasTexture` with `encoding = THREE.sRGBEncoding`;
- a roughness `CanvasTexture` with `encoding = THREE.LinearEncoding`;
- `wrapS = THREE.RepeatWrapping`, `wrapT = THREE.RepeatWrapping`, `repeat.set(3, 4)`, `magFilter = THREE.NearestFilter`, and `minFilter = THREE.NearestFilter` on both exact texture objects;
- one `MeshStandardMaterial` using `map`, `roughnessMap`, white `0xffffff` tint, `metalness = 0.58`, and scalar `roughness = 1` so the roughness map controls the final `0..1` multiplier without making any pixel fully glossy.

Do not use `THREE.SRGBColorSpace`; Three.js 0.133.1 does not export it.

- [ ] **Step 2: Apply the exact shared material everywhere**

Change `IronBox` and `CanonicalArchedLeaf` to receive one `THREE.MeshStandardMaterial`. Render each box and the arch tube with `material={material}`. Remove all per-member color arrays and tint props so arch, bars, divider, panel, and relief blocks use the exact same material object.

- [ ] **Step 3: Remove visible surrounding frame geometry**

Delete `GateFrame` and its render call. Keep both invisible hinge groups and the leaf-local arched perimeters unchanged. Do not add replacement posts, sill, floor, or wall geometry.

- [ ] **Step 4: Dispose resources exactly once**

Create the resource object once with lazy state. In the owning gate's unmount cleanup, dispose the shared material, color texture, and roughness texture exactly once. Do not dispose resources from individual leaf members.

This repository has no React Three Fiber component-test harness. Verify object identity, sampler fields, and owner cleanup through focused implementation self-review plus the independent spec/code-quality reviews, rather than introducing a new DOM/WebGL test stack or a brittle source-text assertion for this visual-only integration.

- [ ] **Step 5: Run automated checks and commit**

Run:

```bash
npm run test:b05
npm run lint
npm run build
git diff --check
```

Expected: tests pass, lint has no errors, production build succeeds, and diff check exits zero. Existing unrelated Fast Refresh, A11/B10 Three.js, and bundle-size warnings may remain.

Commit:

```bash
git add packages/sample/src/poc/ArchedGateB05.tsx
git commit -m "feat: apply b05 procedural roughness material"
```

### Task 3: Verify appearance and provenance

**Files:**
- Modify only if verification exposes a B05-specific defect.

- [ ] **Step 1: Start or reuse the preview server**

Run the sample workspace directly so Vite cannot silently choose another port:

```bash
npm run dev --workspace door-entrance-sample -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/poc/b05`.

- [ ] **Step 2: Inspect closed and opening states**

At progress `0`, verify only the paired gate leaves appear, with no side posts, bottom threshold, floor, or walls. Confirm the material shows dark red-brown iron, broad ochre oxidation, sparse muted green patina, pits, and restrained wear without orange outlines.

At progress around `0.5`, verify both leaves rotate inward around unchanged outer hinges, the shared material remains consistent on all members, and color/roughness features remain visually aligned.

- [ ] **Step 3: Confirm provenance and asset boundary**

Run the focused source scan:

```bash
rg -n "data:image|base64|re-door-gallery|door-transitions|frame-extracts|materials/|https?://" packages/sample/src/poc/b05ProceduralMaterials.ts packages/sample/src/poc/ArchedGateB05.tsx
git diff --name-only main...HEAD
```

Expected: the `rg` command returns no matches, and the changed-file list contains no `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.avif`, `.ktx`, or `.ktx2` asset. In the browser, list page assets after loading `/poc/b05`; confirm no image URL contains `b05`, `re-door-gallery`, `materials`, an external origin, or a new path from this implementation. The app may still expose the pre-existing local `door-lib` image because routes are eagerly imported; record it as unrelated baseline rather than treating it as a B05 dependency.

- [ ] **Step 4: Fix and commit any verification defect**

If Steps 2–3 expose a B05 defect, fix only that defect, rerun the affected automated and visual checks, then commit the fix with a focused conventional message. If no defect is found, do not create an empty commit.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm run test:b05
npm run lint
npm run build
git diff --check
git status --short
```

Expected: all required checks succeed and the worktree is clean.
