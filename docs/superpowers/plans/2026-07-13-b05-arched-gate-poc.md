# B05 Arched Gate POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-contained `/poc/b05` feasibility page that renders a procedural, inward-opening double arched iron gate with no source-image or external texture dependency.

**Architecture:** Pure TypeScript modules calculate the gate geometry, animation state, and deterministic RGBA material. A focused React Three Fiber page converts those values into real-depth Three.js primitives and a `CanvasTexture`, while the public `door-entrance` library remains unchanged.

**Tech Stack:** React 18, TypeScript, React Three Fiber, Three.js, Vite, Tailwind CSS, Node test runner.

---

### Task 1: Define the B05 motion timeline

**Files:**
- Create: `packages/sample/src/poc/b05Motion.test.ts`
- Create: `packages/sample/src/poc/b05Motion.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing motion tests**

Cover clamping, closed/open endpoints, finite camera values, inward signed angles, and the rule that forward camera travel starts only after the leaves have enough clearance.

```ts
test("opens both leaves inward before moving the camera through", () => {
  const closed = getB05MotionState(0);
  const opening = getB05MotionState(0.5);
  const passing = getB05MotionState(0.85);

  assert.equal(closed.leftAngle, 0);
  assert.equal(closed.rightAngle, 0);
  assert.ok(opening.leftAngle > 0);
  assert.ok(opening.rightAngle < 0);
  assert.equal(opening.cameraPosition[2], B05_CAMERA_START_Z);
  assert.ok(passing.cameraPosition[2] < B05_CAMERA_START_Z);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b05Motion.test.ts
```

Expected: FAIL because `b05Motion.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure motion function**

Export `B05_DURATION_MS`, `B05_CAMERA_START_Z`, `B05_MAX_SWING_RADIANS`, the `B05MotionState` interface, and `getB05MotionState(progress)`. `B05MotionState` must explicitly contain `progress` (clamped to `0..1`), signed `leftAngle` and `rightAngle`, finite `cameraPosition` and `cameraTarget` tuples, and `fadeOut` clamped to `0..1`. Use piecewise easing:

- `0.00-0.16`: closed hold;
- `0.16-0.66`: both leaves rotate inward to 85 degrees;
- `0.66-0.92`: camera moves through the opening;
- `0.92-1.00`: fade to black.

Return mirrored signed angles so the two outer hinges rotate into the scene.

- [ ] **Step 4: Add `test:b05` and verify GREEN**

Add a root npm script that initially runs the motion test. Run `npm run test:b05` and expect all motion tests to pass.

- [ ] **Step 5: Commit the motion slice**

```bash
git add package.json packages/sample/src/poc/b05Motion.ts packages/sample/src/poc/b05Motion.test.ts
git commit -m "test: define b05 gate motion"
```

### Task 2: Calculate symmetric arched-gate geometry

**Files:**
- Create: `packages/sample/src/poc/b05Geometry.test.ts`
- Create: `packages/sample/src/poc/b05Geometry.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing geometry tests**

Test that the gate-level left/right placements share mirrored hinge positions and mirror flags, bar heights are positive, bar tops remain below the semicircular arch, and every bar center stays within the leaf bounds.

```ts
test("vertical bars terminate inside the arch", () => {
  const leaf = createB05LeafGeometry();
  for (const bar of leaf.bars) {
    assert.ok(bar.height > 0);
    assert.ok(bar.topY <= archYAtX(bar.x) - B05_BAR_RADIUS);
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b05Geometry.test.ts
```

Expected: FAIL because `b05Geometry.ts` does not exist.

- [ ] **Step 3: Implement geometry constants and calculators**

Define one canonical leaf in local coordinates with its hinge at local `x = 0`. The leaf always extends from `x = 0` to `x = B05_LEAF_WIDTH`; all panel, divider, bar, and arch coordinates use that positive-X interval. Include:

- leaf width and total height;
- solid lower-panel height;
- arch center and radius;
- evenly spaced vertical bars;
- horizontal divider and decorative relief block positions;
- sampled arch path points for `CatmullRomCurve3`/`TubeGeometry`.

Calculate each bar top with the circle equation `centerY + sqrt(radius^2 - localArchX^2)`. Export `createB05LeafGeometry()` for the canonical local members and `createB05GateGeometry()` returning `{ left, right }` with these exact transforms:

- left hinge: `x = -B05_LEAF_WIDTH`, `mirrorX = false`, `rotationSign = 1`; its canonical leaf extends rightward to the center seam;
- right hinge: `x = B05_LEAF_WIDTH`, `mirrorX = true`, `rotationSign = -1`; rendering applies a child `scale.x = -1`, so the canonical leaf extends leftward to the seam;
- both leaves rotate around their hinge group at local `x = 0`; positive left and negative right Y rotation move both leaves toward negative Z, away from the camera and into the scene.

Keep the implementation independent of Three.js by returning numeric tuples and records.

- [ ] **Step 4: Add the test to `test:b05` and verify GREEN**

Run `npm run test:b05`; expect motion and geometry suites to pass.

- [ ] **Step 5: Commit the geometry slice**

```bash
git add package.json packages/sample/src/poc/b05Geometry.ts packages/sample/src/poc/b05Geometry.test.ts
git commit -m "feat: calculate b05 arched gate geometry"
```

### Task 3: Generate original aged-iron material

**Files:**
- Create: `packages/sample/src/poc/b05ProceduralMaterials.test.ts`
- Create: `packages/sample/src/poc/b05ProceduralMaterials.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing material tests**

Test deterministic checksums, exact RGBA buffer length, full opacity, minimum visible luminance, and luminance spread large enough to show pits and oxidation.

```ts
test("aged iron is deterministic and visibly varied", () => {
  const first = createAgedIronPixels(64, 64, 51);
  const second = createAgedIronPixels(64, 64, 51);
  assert.deepEqual(first, second);
  assert.equal(first.length, 64 * 64 * 4);
  assert.ok(luminanceRange(first) >= 70);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --disable-warning=ExperimentalWarning --experimental-strip-types --test packages/sample/src/poc/b05ProceduralMaterials.test.ts
```

Expected: FAIL because `b05ProceduralMaterials.ts` does not exist.

- [ ] **Step 3: Implement deterministic RGBA generation**

Use integer coordinate hashing with fixed seeds. Combine coarse rust islands, fine grain, rare dark pits, and sparse bright scratches. Do not import browser APIs, image files, gallery paths, or network clients.

- [ ] **Step 4: Add the test to `test:b05` and verify GREEN**

Run `npm run test:b05`; expect all three suites to pass.

- [ ] **Step 5: Commit the material slice**

```bash
git add package.json packages/sample/src/poc/b05ProceduralMaterials.ts packages/sample/src/poc/b05ProceduralMaterials.test.ts
git commit -m "feat: generate b05 aged iron material"
```

### Task 4: Build the interactive B05 POC route

**Files:**
- Create: `packages/sample/src/poc/ArchedGateB05.tsx`
- Modify: `packages/sample/src/App.tsx`

- [ ] **Step 1: Add the route import and route entry**

Register `ArchedGateB05` at `/poc/b05` above the catch-all route.

- [ ] **Step 2: Build and dispose the generated Canvas texture**

Convert `createAgedIronPixels` output into an `ImageData`, draw it to a small canvas, create a repeating `CanvasTexture`, set `texture.encoding = THREE.sRGBEncoding` for the installed Three.js API, use nearest filtering, and dispose it when the component unmounts.

- [ ] **Step 3: Render one reusable arched leaf**

Render the lower panel, divider bars, vertical bars, sampled curved perimeter, and deliberately different relief blocks from `createB05LeafGeometry()`. Use `BoxGeometry` and `TubeGeometry` so every member has thickness.

- [ ] **Step 4: Mirror two leaves around outer hinges**

Place hinge groups at the exact `hingeX` values from `createB05GateGeometry()`. Render the canonical child at scale X `1` for the left leaf and `-1` for the right leaf. Apply the signed angles from `getB05MotionState()` to the hinge groups in `useFrame`; the closed leaves meet at `x = 0`, and both rotate toward negative Z without overlap.

- [ ] **Step 5: Add camera, lighting, fade, and controls**

Follow existing POC page behavior: play, reset, progress scrubber, percentage, responsive canvas, black background, camera rig, and end fade. State explicitly that all visual material is generated locally and contains no game pixels or external images.

- [ ] **Step 6: Run focused tests, lint, and build**

Run:

```bash
npm run test:b05
npm run lint
npm run build
```

Expected: focused tests pass, lint has no errors, and production build completes.

- [ ] **Step 7: Commit the route**

```bash
git add packages/sample/src/App.tsx packages/sample/src/poc/ArchedGateB05.tsx
git commit -m "feat: add b05 arched gate poc"
```

### Task 5: Verify the rendered POC and gallery boundary

**Files:**
- Modify only if verification exposes a B05-specific defect.

- [ ] **Step 1: Start the local sample server**

Run `npm run dev` and open `http://127.0.0.1:5173/poc/b05`.

- [ ] **Step 2: Inspect desktop and narrow viewport behavior**

Verify the full gate is visible, controls remain usable, and text does not overflow.

- [ ] **Step 3: Inspect closed, half-open, and full-open states**

Scrub the timeline and confirm arch recognition, real bar thickness, inward rotation, sufficient passage clearance, forward camera motion, and final fade.

- [ ] **Step 4: Confirm asset provenance boundary**

Check browser network activity and source references: no image request may target the gallery, source materials, `public/` texture files, or an external URL.

- [ ] **Step 5: Run final automated verification**

Run:

```bash
npm run test:b05
npm run lint
npm run build
git diff --check
```

Expected: B05 tests, lint, build, and `git diff --check` exit zero. Existing lint/build warnings may remain, but no new B05 warning or error is acceptable.

- [ ] **Step 6: Treat the sibling gallery check as a diagnostic boundary**

At plan-writing time, `gallery:check` fails on a pre-existing sibling working-tree mismatch at door index 16 (`1-1 c03`). The gallery has unrelated uncommitted evaluation changes and must not be overwritten during B05 work. Capture `git -C /Users/mujingtsai/Case/BioHazard/re-door-gallery status --short` and the gallery-check error before and after B05 implementation. Confirm the B05 work added no sibling paths or new error class, and report the known baseline mismatch separately rather than editing gallery files.

```bash
env DOOR_GALLERY_ROOT=/Users/mujingtsai/Case/BioHazard/re-door-gallery npm run gallery:check
```

- [ ] **Step 7: Leave evaluation records unchanged**

Confirm no file under `docs/door-classifications.md`, the sibling gallery, or the CSV changed. Present the local POC URL for user review before changing the B05 verdict or hours.
