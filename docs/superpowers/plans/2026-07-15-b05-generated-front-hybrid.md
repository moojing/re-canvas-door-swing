# B05 Generated Front-Face Hybrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved generated B05 image to the moving gate fronts while preserving procedural 3D side/back depth, fallback behavior, and deterministic verification.

**Architecture:** Keep image-independent pixel transforms and resource ownership in focused B05 modules. `ArchedGateB05.tsx` loads the committed image, asks the modules to create two front materials, and mounts one plane inside each existing hinge group; procedural geometry always remains available as the fallback and supplies depth at oblique angles.

**Tech Stack:** React 18, React Three Fiber, Three.js 0.133.1, TypeScript, Node test runner, Canvas 2D, Vite.

---

## File Structure

- Create `packages/sample/src/poc/b05FrontImage.ts`: immutable asset/crop/material contract plus pure RGBA transparency and crop transforms.
- Create `packages/sample/src/poc/b05FrontImage.test.ts`: committed-PNG identity tests and pure transform/config tests.
- Create `packages/sample/src/poc/b05FrontResources.ts`: browser resource creation, cancellation acceptance, idempotent disposal, and partial-failure cleanup.
- Create `packages/sample/src/poc/b05FrontResources.test.ts`: resource lease and exactly-once disposal tests using structural fakes.
- Create `packages/sample/src/poc/b05FrontLoader.ts`: injectable image-load controller used by React and Node tests.
- Create `packages/sample/src/poc/b05FrontLoader.test.ts`: success, `onerror`, processing exception, and cancellation tests.
- Create `packages/sample/src/poc/b05FrontScene.ts`: pure two-leaf scene descriptor consumed by tests and the React component.
- Create `packages/sample/src/poc/b05FrontScene.test.ts`: left/right assignment, composed orientation, parentage, and fallback tests.
- Modify `packages/sample/src/poc/ArchedGateB05.tsx`: asynchronous image load, procedural fallback, generated front planes, and lifecycle integration.
- Modify `packages/sample/src/poc/b05Geometry.test.ts`: plane placement and seam assertions.
- Modify `package.json`: include both new test files in `npm run test:b05`.
- Use existing `packages/sample/public/textures/b05/generated-gate-front.png`: authoritative generated front asset; do not create another copy.

### Task 0: Stabilize the Existing B05 Prerequisite

**Files:**
- Modify: `packages/sample/src/poc/ArchedGateB05.tsx`
- Modify: `packages/sample/src/poc/b05Geometry.ts`
- Modify: `packages/sample/src/poc/b05Geometry.test.ts`
- Modify: `packages/sample/src/poc/b05Motion.ts`
- Modify: `packages/sample/src/poc/b05Motion.test.ts`
- Modify: `packages/sample/src/poc/b05ProceduralMaterials.ts`
- Modify: `packages/sample/src/poc/b05ProceduralMaterials.test.ts`
- Create: `packages/sample/src/poc/b05TextureMapping.ts`

- [ ] **Step 1: Verify the complete existing B05 change set**

Run `npm run test:b05`, `npm run lint`, `npm run build`, and `git diff --check` from the repository root. Expected: 40 B05 tests pass, lint has no errors, build succeeds, and no whitespace errors appear. Record existing unrelated warnings separately.

- [ ] **Step 2: Inspect scope before staging**

```bash
git diff -- packages/sample/src/poc/ArchedGateB05.tsx packages/sample/src/poc/b05Geometry.ts packages/sample/src/poc/b05Geometry.test.ts packages/sample/src/poc/b05Motion.ts packages/sample/src/poc/b05Motion.test.ts packages/sample/src/poc/b05ProceduralMaterials.ts packages/sample/src/poc/b05ProceduralMaterials.test.ts packages/sample/src/poc/b05TextureMapping.ts
```

Confirm the diff contains only the approved B05 gate structure, camera/light calibration, material, texture mapping, and their tests.

- [ ] **Step 3: Commit the prerequisite without staging hybrid files**

```bash
git add packages/sample/src/poc/ArchedGateB05.tsx packages/sample/src/poc/b05Geometry.ts packages/sample/src/poc/b05Geometry.test.ts packages/sample/src/poc/b05Motion.ts packages/sample/src/poc/b05Motion.test.ts packages/sample/src/poc/b05ProceduralMaterials.ts packages/sample/src/poc/b05ProceduralMaterials.test.ts packages/sample/src/poc/b05TextureMapping.ts
git commit -m "feat: align b05 gate with approved structure"
```

### Task 1: Lock the Asset and Pixel Transform Contract

**Files:**
- Create: `packages/sample/src/poc/b05FrontImage.ts`
- Create: `packages/sample/src/poc/b05FrontImage.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the failing committed-asset identity test**

Read `packages/sample/public/textures/b05/generated-gate-front.png` as bytes. Assert the eight-byte PNG signature, IHDR width `758`, height `636`, bit depth `8`, color type `6`, and SHA-256 `f00e7e6f0844077dc2a930027db3d8dd40b34341d56320b197cd1855ad4cb77b`.

```ts
const asset = readFileSync(B05_FRONT_ASSET_DISK_PATH);
assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(asset.readUInt32BE(16), 758);
assert.equal(asset.readUInt32BE(20), 636);
assert.equal(asset[24], 8);
assert.equal(asset[25], 6);
assert.equal(createHash("sha256").update(asset).digest("hex"), B05_FRONT_SHA256);
```

- [ ] **Step 2: Add failing pure transform tests**

Cover threshold boundaries (`max RGB` 8 and 9), byte preservation, left crop order, and one horizontal reversal for the right crop. Verify `resolveB05FrontUrl("/")` returns the development URL and `resolveB05FrontUrl("/re-canvas-door-swing/")` preserves the production Vite base. Export exact immutable contracts:

```ts
export const B05_FRONT_IMAGE = {
  publicPath: "textures/b05/generated-gate-front.png",
  width: 758,
  height: 636,
  sha256: "f00e7e6f0844077dc2a930027db3d8dd40b34341d56320b197cd1855ad4cb77b",
  alphaThreshold: 8,
  leftCrop: { x: 44, y: 20, width: 324, height: 616, flipX: false },
  rightCrop: { x: 368, y: 20, width: 324, height: 616, flipX: true },
} as const;

export const resolveB05FrontUrl = (baseUrl: string): string =>
  `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}${B05_FRONT_IMAGE.publicPath}`;

export const B05_FRONT_PLANE = {
  size: [2.7, 5.35] as const,
  position: [1.35, 2.675, 0.22] as const,
} as const;
```

- [ ] **Step 3: Run the new test and verify RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b05FrontImage.test.ts
```

Expected: FAIL because `b05FrontImage.ts` or its exports do not exist.

- [ ] **Step 4: Implement the minimal pure image functions**

Implement functions that mutate only alpha in a cloned source buffer and extract an RGBA crop with optional horizontal reversal. Validate source length before indexing.

```ts
export const removeB05NearBlackBackground = (
  source: Uint8ClampedArray,
): Uint8ClampedArray => {
  const output = source.slice();
  for (let index = 0; index < output.length; index += 4) {
    if (Math.max(output[index], output[index + 1], output[index + 2]) <= 8) {
      output[index + 3] = 0;
    }
  }
  return output;
};
```

`extractB05FrontCrop` copies all RGBA bytes from the processed source. For `flipX`, destination x maps to `crop.x + crop.width - 1 - destinationX`; otherwise it maps to `crop.x + destinationX`.

- [ ] **Step 5: Add the new tests to `test:b05` and verify GREEN**

Run `npm run test:b05`.

Expected: all existing tests plus asset and transform tests pass.

- [ ] **Step 6: Commit the focused contract**

```bash
git add package.json packages/sample/src/poc/b05FrontImage.ts packages/sample/src/poc/b05FrontImage.test.ts
git commit -m "test: lock b05 generated front contract"
```

### Task 2: Build Idempotent Browser Resource Ownership

**Files:**
- Create: `packages/sample/src/poc/b05FrontResources.ts`
- Create: `packages/sample/src/poc/b05FrontResources.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing resource pipeline and lease tests**

Inject structural factories instead of requiring DOM or WebGL in tests. Fakes must record every assigned texture/material property and increment a counter on `dispose()`. Test the actual pipeline behavior:

- successful source pixels create two textures and two materials with `flipY = true`, clamp wrapping, linear filters, no mipmaps, sRGB encoding, white `0xffffff` tint, `transparent`, `alphaTest = 0.03`, depth test/write, front side, and tone mapping disabled;
- a factory exception after one texture exists disposes that partial texture exactly once and publishes nothing;
- `accept(resources): boolean` returns `true` before cancellation and `false` after cancellation;
- accepted resources dispose exactly once on repeated cleanup;
- resources arriving after cancellation dispose immediately and are not published;
- load failure with no resources is a no-op.

- [ ] **Step 2: Run the resource tests and verify RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b05FrontResources.test.ts
```

Expected: FAIL because the injectable pipeline, rendering assignments, and resource lease do not exist.

- [ ] **Step 3: Implement the resource lease and exported rendering contract**

Use one lease per React effect. `accept(resources): boolean` either stores resources and returns `true`, or disposes them immediately and returns `false` when cancelled. `cancel()` is idempotent and disposes accepted resources once. `disposePartial(resources)` uses the same idempotent disposer.

Export a Three-independent rendering contract for tests:

```ts
export const B05_FRONT_RENDERING = {
  wrap: "clamp-to-edge",
  minFilter: "linear",
  magFilter: "linear",
  flipY: true,
  generateMipmaps: false,
  encoding: "srgb",
  color: 0xffffff,
  transparent: true,
  alphaTest: 0.03,
  depthTest: true,
  depthWrite: true,
  side: "front",
  toneMapped: false,
} as const;
```

- [ ] **Step 4: Implement an injectable resource pipeline and thin browser adapter**

`buildB05FrontResources(sourcePixels, factories)` must use the pure crop functions, call injected texture/material factories, assign every rendering property, catch any factory exception, dispose partial resources, and rethrow. The Node tests invoke this function with structural fakes.

The first pipeline operation must be `removeB05NearBlackBackground(sourcePixels)`, and both crops must come from that processed buffer. Tests must assert a threshold-background endpoint reaches each crop with alpha `0` while a non-background endpoint preserves its original alpha.

The browser-only adapter validates the loaded image dimensions, draws it to a `758 x 636` canvas, reads RGBA bytes, and delegates to the same tested pipeline with real `THREE.CanvasTexture` and `THREE.MeshBasicMaterial` factories. No test imports or initializes a browser canvas.

- [ ] **Step 5: Verify GREEN and the full B05 suite**

Run `npm run test:b05`.

Expected: all tests pass with no uncaught browser dependency in Node tests.

- [ ] **Step 6: Commit resource ownership**

```bash
git add package.json packages/sample/src/poc/b05FrontResources.ts packages/sample/src/poc/b05FrontResources.test.ts
git commit -m "feat: manage b05 generated front resources"
```

### Task 3: Attach Generated Fronts to the Moving Leaves

**Files:**
- Create: `packages/sample/src/poc/b05FrontLoader.ts`
- Create: `packages/sample/src/poc/b05FrontLoader.test.ts`
- Create: `packages/sample/src/poc/b05FrontScene.ts`
- Create: `packages/sample/src/poc/b05FrontScene.test.ts`
- Modify: `packages/sample/src/poc/ArchedGateB05.tsx`
- Modify: `packages/sample/src/poc/b05Geometry.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add failing scene descriptor and composed-orientation tests**

Require `createB05FrontSceneDescriptor(resources | null)` to always return two procedural leaf descriptors. With `null`, both front materials are absent, proving deterministic fallback. With resources, left material must map only to the unmirrored left leaf and right material only to the `mirrorX: true` right leaf; both front planes declare parentage inside `hinge -> mirror -> leaf`.

Assert plane width equals `B05_LEAF_WIDTH`, height equals `B05_TOTAL_HEIGHT`, local x bounds are `0..B05_LEAF_WIDTH`, and closed world bounds meet at `x = 0` within `0.01`. Use crop endpoint ids to prove composed orientation: left world outer-to-center is source `44 -> 367`; pre-reversed right local outer-to-center is source `691 -> 368`, and after the mirrored group world center-to-outer is source `368 -> 691` exactly once.

In the same test file, assert `packages/sample/public/textures/b05/` contains only `generated-gate-front.png`; scan the B05 front implementation dependency graph for gallery paths, game-frame paths, data URIs, and `http://`/`https://`; assert the scene descriptor contains exactly two leaves and no side post, threshold, floor, or wall descriptor.

Write loader-controller tests with an injected fake image factory, injected async/synchronous resource builder, and publish spy. Verify handlers exist before `src` is assigned; success publishes only when `accept()` succeeds; `onerror` publishes nothing; a resource-builder exception publishes nothing and disposes partial resources; cleanup before `onload` clears handlers, cancels the lease, and prevents later publication.

- [ ] **Step 2: Run the new files directly and verify RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b05FrontLoader.test.ts packages/sample/src/poc/b05FrontScene.test.ts
```

Expected: FAIL because the loader controller, fallback descriptors, material assignment, parentage, and composed orientation do not exist.

- [ ] **Step 3: Add asynchronous image loading with procedural fallback**

Implement `startB05FrontLoad({ url, createImage, createResources, publish })` in `b05FrontLoader.ts`; it owns the lease, assigns both handlers before `src`, and returns idempotent cleanup. `ArchedGate` calls it with `createImage: () => new Image()` and `url: resolveB05FrontUrl(import.meta.env.BASE_URL)`. On load, the controller creates resources inside `try/catch`; it publishes only when `lease.accept(resources)` returns `true`. On load error or processing exception it publishes nothing. Cleanup clears both handlers, cancels the lease, and leaves the pure scene descriptor in procedural fallback mode.

- [ ] **Step 4: Add the generated front plane component**

Render a plane only when a material exists:

```tsx
const GeneratedFront = ({ material }: { material: THREE.MeshBasicMaterial }) => (
  <mesh position={[...B05_FRONT_PLANE.position]} material={material}>
    <planeGeometry args={[...B05_FRONT_PLANE.size]} />
  </mesh>
);
```

Render from `createB05FrontSceneDescriptor`, not ad hoc left/right conditionals. Pass the left material to the canonical left leaf and the pre-reversed right material to the canonical right leaf. Keep each plane inside the same hinge and mirror groups as all other leaf geometry. Do not add a stationary overlay.

- [ ] **Step 5: Verify automated integration and fallback**

Add `b05FrontLoader.test.ts` and `b05FrontScene.test.ts` to `test:b05`, then run `npm run test:b05`. Require automated assertions for normal assignment, failed-load/no-resource fallback, cancellation-before-load, and no resource publication after cancellation. Browser verification supplements these tests; do not temporarily edit the committed URL.

- [ ] **Step 6: Commit the moving hybrid fronts**

```bash
git add package.json packages/sample/src/poc/ArchedGateB05.tsx packages/sample/src/poc/b05Geometry.test.ts packages/sample/src/poc/b05FrontLoader.ts packages/sample/src/poc/b05FrontLoader.test.ts packages/sample/src/poc/b05FrontScene.ts packages/sample/src/poc/b05FrontScene.test.ts
git commit -m "feat: apply generated fronts to b05 gate"
```

### Task 4: Perform the Mandatory Visual Completion Gate

**Files:**
- Verify: `packages/sample/src/poc/ArchedGateB05.tsx`
- Reference: `packages/sample/public/textures/b05/generated-gate-front.png`
- Temporary output: `/private/tmp/b05-visual-comparison/`

- [ ] **Step 1: Run fresh automated verification**

```bash
npm run test:b05
npm run lint
npm run build
git diff --check
```

Expected: 0 test failures, 0 lint errors, successful production build, and no whitespace errors. Existing unrelated warnings must be reported separately.

- [ ] **Step 2: Capture the closed gate at progress `0`**

Prepare exact outputs and start the local preview:

```bash
mkdir -p /private/tmp/b05-visual-comparison
rm -f /private/tmp/b05-visual-comparison/baseline.png /private/tmp/b05-visual-comparison/render-0.png /private/tmp/b05-visual-comparison/side-by-side-0.png /private/tmp/b05-visual-comparison/render-0.3.png /private/tmp/b05-visual-comparison/full-0.jpg /private/tmp/b05-visual-comparison/full-0.3.jpg
cp packages/sample/public/textures/b05/generated-gate-front.png /private/tmp/b05-visual-comparison/baseline.png
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/poc/b05`, reset the control to `0`, capture only the interactive gate region as `/private/tmp/b05-visual-comparison/render-0.png`, then create the required comparison:

Use the in-app Browser at its fixed `1280 x 720` viewport. `tab.screenshot()` returns JPEG bytes; write them with `node:fs/promises.writeFile` to `/private/tmp/b05-visual-comparison/full-0.jpg`, then crop the known `1024 x 432` interactive region at `(128, 152)`:

```bash
ffmpeg -y -i /private/tmp/b05-visual-comparison/full-0.jpg -vf "crop=1024:432:128:152" /private/tmp/b05-visual-comparison/render-0.png
```

Verify the full screenshot is exactly `1280 x 720` before applying this crop; stop and recalculate the crop rather than using stale coordinates if it differs.

```bash
ffmpeg -y -i /private/tmp/b05-visual-comparison/baseline.png -i /private/tmp/b05-visual-comparison/render-0.png -filter_complex "[0:v]scale=758:636[a];[1:v]scale=758:636[b];[a][b]hstack=inputs=2" /private/tmp/b05-visual-comparison/side-by-side-0.png
```

Inspect `side-by-side-0.png`. Check the outer arch, center seam, rails, four bars per leaf, collars, panel frames, hexagons, rust distribution, and lack of surrounding geometry. The geometry test must also prove the seam is within `0.01` world units; reject any visible black rectangle outside the gate silhouette. Do not accept automated tests as a substitute for this capture.

- [ ] **Step 3: Capture the gate at progress `0.3`**

Set the range control to exactly `0.3`: fill it with `0.299`, then press `ArrowRight` once so React receives the input event and the status reads `30%`. Save `tab.screenshot()` bytes to `/private/tmp/b05-visual-comparison/full-0.3.jpg`, apply the same verified crop to `/private/tmp/b05-visual-comparison/render-0.3.png`, then delete both `full-*.jpg` intermediates. Confirm both generated fronts rotate with their complete leaf groups, side thickness is visible, and no plane, trim, or plaque remains at the closed position.

- [ ] **Step 4: Inspect browser errors and asset requests**

Require zero browser console errors. Confirm the only new B05 image request is `/textures/b05/generated-gate-front.png` in development. Then start the production preview and inspect the production-base route:

```bash
npm run preview --workspace door-entrance-sample -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/re-canvas-door-swing/poc/b05`, require zero errors, and confirm the generated asset request is `/re-canvas-door-swing/textures/b05/generated-gate-front.png`. Neither preview may request a gallery path, game frame, data URI, or external URL.

- [ ] **Step 5: Save only temporary comparison artifacts**

Require exactly `baseline.png`, `render-0.png`, `side-by-side-0.png`, and `render-0.3.png` under `/private/tmp/b05-visual-comparison/`. Do not add these temporary duplicates or renders to git.

- [ ] **Step 6: Commit any visual-calibration fixes only after re-running all verification**

```bash
git add packages/sample/src/poc/ArchedGateB05.tsx packages/sample/src/poc/b05Geometry.ts packages/sample/src/poc/b05Geometry.test.ts packages/sample/src/poc/b05Motion.ts packages/sample/src/poc/b05Motion.test.ts packages/sample/src/poc/b05ProceduralMaterials.ts packages/sample/src/poc/b05ProceduralMaterials.test.ts packages/sample/src/poc/b05TextureMapping.ts packages/sample/src/poc/b05FrontImage.ts packages/sample/src/poc/b05FrontImage.test.ts packages/sample/src/poc/b05FrontResources.ts packages/sample/src/poc/b05FrontResources.test.ts packages/sample/src/poc/b05FrontLoader.ts packages/sample/src/poc/b05FrontLoader.test.ts packages/sample/src/poc/b05FrontScene.ts packages/sample/src/poc/b05FrontScene.test.ts
git commit -m "fix: align b05 hybrid gate with baseline"
```
