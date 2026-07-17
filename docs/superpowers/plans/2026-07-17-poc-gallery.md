# POC Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static-thumbnail `/poc` index for A11, B10, C03, B05, and B06 while removing A11's original-frame placeholder and enforcing that every linked POC ships no original game pixels.

**Architecture:** Replace A11's image loader with deterministic procedural color and roughness maps while preserving its primitive geometry and animation. Add one pure gallery registry consumed by a lightweight React card grid, then capture five canonical `960x540` PNGs from the now-safe WebGL canvases. Node tests lock runtime provenance, approved bitmap identities, gallery metadata, and thumbnail identities; browser checks cover layout and navigation.

**Tech Stack:** React 18, React Router 6, React Three Fiber, Three.js 0.133, TypeScript, Tailwind CSS, Node test runner, Vite, in-app browser capture.

---

## File Structure

- Create `packages/sample/src/poc/a11ProceduralMaterials.ts`: deterministic RGBA color and roughness generation for A11.
- Create `packages/sample/src/poc/a11ProceduralMaterials.test.ts`: pixel identity, opacity, variation, and validation tests.
- Modify `packages/sample/src/poc/HeavyWaterDoorA11.tsx`: remove screenshot loading and bind project-owned procedural textures.
- Create `packages/sample/src/poc/pocProvenance.test.ts`: dependency graph and shipped-asset guards for all five POCs.
- Create `packages/sample/src/poc/pocGalleryData.ts`: immutable card registry and thumbnail identities.
- Create `packages/sample/src/poc/pocGalleryData.test.ts`: registry, path, PNG, dimensions, hash, and directory tests.
- Create `packages/sample/src/poc/PocGallery.tsx`: accessible static-thumbnail card grid.
- Modify `packages/sample/src/App.tsx`: add the `/poc` index route before detail routes.
- Modify `package.json`: add focused `test:a11` and `test:poc-gallery` scripts.
- Create `packages/sample/public/poc-thumbnails/{a11,b10,c03,b05,b06}.png`: safe canonical captures.

Do not modify evaluation reports, CSV files, the sibling gallery, ignored materials, source videos, or extracted frames.

### Task 1: Deterministic A11 Procedural Material Generator

**Files:**
- Create: `packages/sample/src/poc/a11ProceduralMaterials.ts`
- Create: `packages/sample/src/poc/a11ProceduralMaterials.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the focused test script**

Add:

```json
"test:a11": "node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/a11ProceduralMaterials.test.ts"
```

- [ ] **Step 2: Write failing generator contract tests**

Cover deterministic output, seed sensitivity, complete RGBA lengths, opaque color alpha, grayscale roughness, visible luminance variation, and invalid width/height/seed rejection.

```ts
test("creates deterministic opaque A11 material maps", () => {
  const first = createA11MaterialPixels(64, 64, 0x0a11);
  const second = createA11MaterialPixels(64, 64, 0x0a11);

  assert.deepEqual(first, second);
  assert.equal(first.colorPixels.length, 64 * 64 * 4);
  assert.equal(first.roughnessPixels.length, 64 * 64 * 4);
  for (let index = 0; index < first.colorPixels.length; index += 4) {
    assert.equal(first.colorPixels[index + 3], 255);
    assert.equal(first.roughnessPixels[index], first.roughnessPixels[index + 1]);
    assert.equal(first.roughnessPixels[index + 1], first.roughnessPixels[index + 2]);
    assert.equal(first.roughnessPixels[index + 3], 255);
  }
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm run test:a11`

Expected: FAIL because `a11ProceduralMaterials.ts` does not exist.

- [ ] **Step 4: Implement the minimal deterministic generator**

Export this contract:

```ts
export type A11MaterialPixels = Readonly<{
  colorPixels: Uint8ClampedArray;
  roughnessPixels: Uint8ClampedArray;
}>;

export const createA11MaterialPixels = (
  width: number,
  height: number,
  seed: number,
): A11MaterialPixels => {
  // Validate positive safe integer dimensions, a finite integer seed, and a safe pixel cap.
  // Use a local seeded PRNG plus low-frequency patches and sparse wear marks.
  // Emit dark iron/rust color and aligned grayscale roughness, always alpha 255.
};
```

Use project-owned math only. Do not read image files, DOM state, URLs, gallery files, or external randomness.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm run test:a11`

Expected: all A11 generator tests PASS.

- [ ] **Step 6: Commit the generator**

```bash
git add package.json packages/sample/src/poc/a11ProceduralMaterials.ts packages/sample/src/poc/a11ProceduralMaterials.test.ts
git commit -m "feat: generate safe a11 materials"
```

### Task 2: Remove A11 Original-Frame Runtime Loading

**Files:**
- Modify: `packages/sample/src/poc/HeavyWaterDoorA11.tsx`
- Create: `packages/sample/src/poc/pocProvenance.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a failing A11 runtime provenance test**

Create a local-dependency collector modeled on `b05FrontScene.test.ts`. Strip block and line comments before checking executable source. Traverse `HeavyWaterDoorA11.tsx` and assert that it reaches `a11ProceduralMaterials.ts` and contains none of:

```ts
const forbiddenRuntimeSources = [
  /["'`][^"'`]*textures\/poc-[^"'`]*/i,
  /["'`][^"'`]*(?:re-door-gallery|frame-extracts|source-videos|materials\/)[^"'`]*["'`]/i,
  /data:image\//i,
  /https?:\/\//i,
];
```

Also assert that no committed `packages/sample/public/textures/a11` or `packages/sample/public/textures/poc-a11` directory is required.

- [ ] **Step 2: Add a focused provenance script and verify RED**

Add:

```json
"test:poc-gallery": "node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/pocProvenance.test.ts"
```

Run: `npm run test:poc-gallery`

Expected: FAIL because A11 still contains `/textures/poc-a11` and does not depend on the procedural generator.

- [ ] **Step 3: Replace A11 image loading with procedural textures**

Delete `TEX_BASE`, `useDoorTexture`, every `file` prop, every `TextureLoader` call, and screenshot-specific comments/copy.

Add a local texture hook that converts the pure generator output to two `CanvasTexture` instances and disposes both:

```ts
const useA11Textures = () => {
  const textures = useMemo(() => {
    const pixels = createA11MaterialPixels(256, 256, 0x0a11);
    return {
      color: createCanvasTexture(pixels.colorPixels, 256, 256, true),
      roughness: createCanvasTexture(pixels.roughnessPixels, 256, 256, false),
    };
  }, []);
  useEffect(() => () => {
    textures.color.dispose();
    textures.roughness.dispose();
  }, [textures]);
  return textures;
};
```

Pass these textures through `A11Door`, `ReliefPart`, and `ValveWheel`. Use `meshStandardMaterial` with project-owned dark iron colors, `map`, `roughnessMap`, `metalness` around `0.65`, and `roughness` around `0.82`. Keep all current geometry, hinge motion, wheel motion, camera motion, and fade behavior.

Change visible copy to state that the appearance is deterministic and procedural and contains no original game pixels.

- [ ] **Step 4: Verify A11 and provenance GREEN**

Run:

```bash
npm run test:a11
npm run test:poc-gallery
npm run lint --workspace door-entrance-sample
npm run build:sample
```

Expected: tests and build PASS; lint has no new errors.

- [ ] **Step 5: Browser-check A11 before any thumbnail capture**

Start the sample server and inspect `/poc/a11` at progress `0`, mid-open, and complete. Confirm the procedural maps are visible on the panel, relief pieces, housing, and wheel, and browser logs contain no requests under `/textures/poc-a11`.

- [ ] **Step 6: Commit the safe A11 runtime**

```bash
git add package.json packages/sample/src/poc/HeavyWaterDoorA11.tsx packages/sample/src/poc/pocProvenance.test.ts
git commit -m "feat: remove original pixels from a11 poc"
```

### Task 3: Enforce Provenance for Every Linked POC

**Files:**
- Modify: `packages/sample/src/poc/pocProvenance.test.ts`
- Reference: `packages/sample/src/poc/b05FrontScene.test.ts`
- Reference: `packages/sample/src/poc/b06Assets.test.ts`

- [ ] **Step 1: Extend the dependency scan to all five entry points**

Traverse:

```ts
const entries = [
  "HeavyWaterDoorA11.tsx",
  "SewerGateB10.tsx",
  "LiftPlatformC03.tsx",
  "ArchedGateB05.tsx",
  "HeavyWaterDoubleDoorB06.tsx",
] as const;
```

Apply the runtime-source patterns after comments are stripped. Assert each expected local dependency is actually traversed so a broken import parser cannot create a false pass.

In the same test file, centralize comment stripping, dependency traversal, string-literal extraction, forbidden-source matching, and per-entry image allowlist comparison. Extract every executable string or template fragment containing `textures/`, `poc-thumbnails/`, or ending in `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, or `.svg`. Fail when an extracted image-related fragment is not explicitly allowed for that entry point.

Use these initial allowlists:

```ts
const approvedImageFragments = {
  "HeavyWaterDoorA11.tsx": [],
  "SewerGateB10.tsx": [
    "/textures/b10",
    "door.png",
    "lower.png",
    "lever-sign.png",
    "lever-box.png",
  ],
  "LiftPlatformC03.tsx": [],
  "ArchedGateB05.tsx": ["textures/b05/generated-gate-front.png"],
  "HeavyWaterDoubleDoorB06.tsx": [
    "textures/b06/normal.png",
    "textures/b06/frozen.png",
  ],
} as const;
```

Normalize a leading slash before comparison, but do not allow basename-only fragments to match arbitrary directories. The B10 split base-plus-filename form is the only approved composed-path exception. This makes a new reference such as `/textures/door-2.png` fail even when that file already exists elsewhere in `public/`.

- [ ] **Step 2: Add B10 allowlist and identity tests**

Assert the exact sorted directory contents and SHA-256 values from the spec:

```ts
assert.deepEqual(files, ["door.png", "lever-box.png", "lever-sign.png", "lower.png"]);
assert.equal(sha256("door.png"), "09f57fd7f8a6d994d75b27b2d63e1483a87db4eefabb2d63d1e63b575b3f3a14");
// Assert the other three approved hashes from the spec.
```

Keep the existing B05 and B06 asset hash/directory tests active. Confirm C03 and A11 require no image texture directories. The file identity checks and the per-entry runtime allowlists must both pass: directory contents alone are not sufficient provenance evidence.

- [ ] **Step 3: Run all provenance and existing POC tests**

Run:

```bash
npm run test:poc-gallery
npm run test:b05
npm run test:b06
npm run test:c03
```

Expected: all tests PASS.

- [ ] **Step 4: Commit cross-POC provenance coverage**

```bash
git add packages/sample/src/poc/pocProvenance.test.ts
git commit -m "test: enforce poc asset provenance"
```

### Task 4: Add the Gallery Registry and Route

**Files:**
- Create: `packages/sample/src/poc/pocGalleryData.ts`
- Create: `packages/sample/src/poc/pocGalleryData.test.ts`
- Create: `packages/sample/src/poc/PocGallery.tsx`
- Modify: `packages/sample/src/App.tsx`
- Modify: `packages/sample/src/poc/pocProvenance.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing registry tests**

Require exactly five immutable records in order, unique IDs/routes/thumbnails, internal routes only, and the canonical copy from the spec. The initial asset identity may be `null` until Task 5 captures and pins each PNG. Test thumbnail URL resolution with both `/` and `/re-canvas-door-swing/` bases and assert that no output starts with `//`.

```ts
assert.deepEqual(POC_GALLERY_ITEMS.map(({ id, route }) => ({ id, route })), [
  { id: "A11", route: "/poc/a11" },
  { id: "B10", route: "/poc/b10" },
  { id: "C03", route: "/poc/c03" },
  { id: "B05", route: "/poc/b05" },
  { id: "B06", route: "/poc/b06" },
]);
```

Update `test:poc-gallery` to include both test files:

```json
"test:poc-gallery": "node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/pocProvenance.test.ts packages/sample/src/poc/pocGalleryData.test.ts"
```

- [ ] **Step 2: Run the registry test and verify RED**

Run: `npm run test:poc-gallery`

Expected: FAIL because `pocGalleryData.ts` does not exist.

- [ ] **Step 3: Implement the immutable registry**

Export one frozen array with frozen records containing `id`, `title`, `description`, `route`, `thumbnailPath`, and later `sha256`. Keep thumbnail paths relative without a leading slash. Export a pure `resolvePocThumbnailUrl(baseUrl, thumbnailPath)` helper that removes duplicate boundary slashes and returns exactly one leading slash for local bases. Use it with `import.meta.env.BASE_URL` so development and production basenames work without creating protocol-relative URLs.

- [ ] **Step 4: Implement the equal-weight gallery grid**

Build `PocGallery.tsx` with:

- A black/brown radial background and restrained amber accents.
- A Georgia-style editorial heading rather than the default application font stack.
- A responsive `sm:grid-cols-2 lg:grid-cols-3` card grid.
- One React Router `Link` wrapping each whole card.
- A `16/9` media frame, `loading="lazy"`, descriptive `alt`, and a dark ID fallback revealed by `onError`.
- No `Canvas`, iframe, detail component import, autoplay, or animation loop.
- Clear keyboard focus and a small directional hover reveal.

- [ ] **Step 5: Add the `/poc` route**

Import `PocGallery` in `App.tsx` and insert:

```tsx
<Route path="/poc" element={<PocGallery />} />
```

before `/poc/a11` and the catch-all route.

- [ ] **Step 6: Verify registry, lint, and build**

Before verification, extend the provenance entry matrix with `PocGallery.tsx`. Require traversal of `pocGalleryData.ts` and allow exactly these gallery image fragments:

```ts
[
  "poc-thumbnails/a11.png",
  "poc-thumbnails/b10.png",
  "poc-thumbnails/c03.png",
  "poc-thumbnails/b05.png",
  "poc-thumbnails/b06.png",
]
```

The gallery graph uses the same remote/embedded/prohibited path checks as all detail entries. Any hardcoded image URL outside this list must fail.

Run:

```bash
npm run test:poc-gallery
npm run lint --workspace door-entrance-sample
npm run build:sample
```

Expected: registry tests PASS; build resolves `/poc`; no new lint errors.

- [ ] **Step 7: Commit the gallery shell**

```bash
git add package.json packages/sample/src/App.tsx packages/sample/src/poc/PocGallery.tsx packages/sample/src/poc/pocGalleryData.ts packages/sample/src/poc/pocGalleryData.test.ts packages/sample/src/poc/pocProvenance.test.ts
git commit -m "feat: add poc gallery index"
```

### Task 5: Capture and Pin Five Safe Thumbnails

**Files:**
- Create: `packages/sample/public/poc-thumbnails/a11.png`
- Create: `packages/sample/public/poc-thumbnails/b10.png`
- Create: `packages/sample/public/poc-thumbnails/c03.png`
- Create: `packages/sample/public/poc-thumbnails/b05.png`
- Create: `packages/sample/public/poc-thumbnails/b06.png`
- Modify: `packages/sample/src/poc/pocGalleryData.ts`
- Modify: `packages/sample/src/poc/pocGalleryData.test.ts`

- [ ] **Step 1: Start the correct sample server**

Run:

```bash
npm run dev --workspace door-entrance-sample -- --host 127.0.0.1 --port 5176
```

Use `@browser:control-in-app-browser`. Set the browser viewport override to exactly `1440x1000`; do not set a device-scale override.

- [ ] **Step 2: Capture each canonical initial state**

For each route, navigate directly, reset progress to `0`, wait for safe materials to load, confirm no asset warning, and read the WebGL canvas bounding rectangle. Capture a `960x540` clip centered on the canvas rectangle. If the canvas is 520 pixels high, include ten pixels of adjacent safe page background above and below. Capture B06 in Normal mode.

Write screenshot bytes directly to the corresponding path under `packages/sample/public/poc-thumbnails/`. Never read the sibling gallery, ignored materials, source videos, frame extracts, or original screenshots.

- [ ] **Step 3: Inspect every PNG before registry use**

Use `view_image` for all five files. Confirm each image shows only its POC against the intended dark background, has no controls/headings/browser chrome, and contains no original game imagery.

- [ ] **Step 4: Write failing asset identity tests**

For each PNG assert signature, IHDR width `960`, height `540`, RGB/RGBA color type, and SHA-256 matching the registry. Assert the thumbnail directory contains exactly the five approved names.

Run: `npm run test:poc-gallery`

Expected: FAIL while the registry hash values are still unset or incorrect.

- [ ] **Step 5: Record the five SHA-256 values**

Compute with:

```bash
shasum -a 256 packages/sample/public/poc-thumbnails/*.png
```

Copy the exact values into the corresponding frozen registry records.

- [ ] **Step 6: Verify thumbnail tests GREEN**

Run: `npm run test:poc-gallery`

Expected: all registry, provenance, PNG dimension, directory, and hash tests PASS.

- [ ] **Step 7: Commit canonical thumbnails**

```bash
git add packages/sample/public/poc-thumbnails packages/sample/src/poc/pocGalleryData.ts packages/sample/src/poc/pocGalleryData.test.ts
git commit -m "feat: add safe poc thumbnails"
```

### Task 6: Browser and Full Regression Verification

**Files:**
- Modify only if verification exposes a tested defect.

- [ ] **Step 1: Verify the gallery at desktop width**

Open `/poc` at `1440x1000`. Confirm five equal-weight cards, visible thumbnails, no WebGL canvas, no horizontal overflow, and keyboard focus on every card.

- [ ] **Step 2: Verify mobile layout**

Set viewport to `390x844`. Confirm a single-column list, legible titles/descriptions, contained thumbnails, and tappable full-card links. Reset the viewport override afterward.

- [ ] **Step 3: Verify all navigation targets**

Open each card and confirm it reaches the expected route. For each destination, play enough animation to verify the scene remains interactive. Specifically inspect A11 logs/network state and confirm no `/textures/poc-*`, gallery, materials, frame, source-video, embedded-image, or remote-image request.

- [ ] **Step 4: Run the complete verification suite**

Run:

```bash
npm run test:a11
npm run test:poc-gallery
npm run test:b05
npm run test:b06
npm run test:c03
npm run lint
npm run build
git diff --check
```

Expected: all tests PASS, lint has no new errors, production build succeeds, and whitespace check is clean. Existing unrelated warnings must be reported rather than silently changed.

- [ ] **Step 5: Verify production basename behavior**

Run:

```bash
npm run preview --workspace door-entrance-sample -- --host 127.0.0.1 --port 4177
```

Open `/re-canvas-door-swing/poc`, confirm all five thumbnails load beneath the production base, and open at least one detail route.

- [ ] **Step 6: Request final code review**

Use `@superpowers:requesting-code-review` against the implementation range. Fix all Critical and Important findings, rerun the affected tests, and document residual visual risks.

- [ ] **Step 7: Commit verification-only fixes if needed**

```bash
git add <only files changed by verified fixes>
git commit -m "fix: finalize poc gallery verification"
```

Do not create an empty commit when verification requires no code changes.
