# C06 Drilled Hole PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an original-textured, camera-only drilled-hole transition at `/poc/c06`.

**Architecture:** Keep deterministic scene data and camera timing in a small pure TypeScript module, then consume it from a React Three Fiber page. Compose the wall from panels and brick boxes so every exposed surface has real depth and receives the generated texture.

**Tech Stack:** React 18, TypeScript, React Three Fiber, Three.js, Vitest, Vite

---

## Task 1: Lock Scene Behavior With Tests

**Files:**
- Create: `packages/sample/src/poc/c06SceneModel.test.ts`
- Create: `packages/sample/src/poc/c06SceneModel.ts`
- Modify: `packages/sample/package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install and register the test runner**

Run: `npm install --save-dev vitest@2.1.9 --workspace door-entrance-sample`

Add `"test:c06": "vitest run src/poc/c06SceneModel.test.ts"` to the sample scripts.

- [ ] **Step 2: Write the failing test**

Test that camera progress clamps at both ends, moves monotonically from the front of the wall to behind it, and that all jagged-edge bricks expose positive dimensions. Assert that the layout has bricks on the top, right, bottom, and left sides, with unequal offsets that preserve the stepped asymmetry.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:c06 --workspace door-entrance-sample`
Expected: FAIL because `c06SceneModel.ts` does not exist.

- [ ] **Step 4: Write minimal implementation**

Export `C06_DURATION_SECONDS`, `getC06CameraState(elapsed)`, and immutable `C06_EDGE_BRICKS` layout data.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:c06 --workspace door-entrance-sample`
Expected: all C06 model tests pass.

### Task 2: Generate Original Brick Texture

**Files:**
- Create: `packages/sample/public/textures/c06/aged-brick-albedo.png`
- Create: `packages/sample/public/textures/c06/README.md`

- [ ] **Step 1: Generate one square diffuse texture**

Use the built-in image generation tool for a flat, original, seamless-looking damp brick albedo with no hole, text, logo, objects, or directional shadows.

- [ ] **Step 2: Inspect the generated image**

Verify front-facing brick courses, usable edges, even illumination, and no copied source composition.

- [ ] **Step 3: Record provenance**

Document the final prompt, generation method, date, and usage in the texture README.

### Task 3: Build and Mount the PoC

**Files:**
- Create: `packages/sample/src/poc/C06DrilledHolePoC.tsx`
- Modify: `packages/sample/src/App.tsx`
- Modify: `packages/sample/src/pages/Index.tsx`

- [ ] **Step 1: Build the wall and receiving space**

Compose outer wall panels, textured edge bricks, floor, rear wall, vignette lighting, and fog. Use the same original map on all exposed brick faces.

- [ ] **Step 2: Add deterministic camera travel**

Drive the camera from `getC06CameraState`, autoplay once, support replay, and fade at the end without animating scene geometry.

- [ ] **Step 3: Add the explanatory presentation**

Include on-page notes covering primitive wall construction, camera-only motion, and the generated texture's original provenance.

- [ ] **Step 4: Register the route and card additively**

Before editing, save `git diff --cached -- packages/sample/src/App.tsx packages/sample/src/pages/Index.tsx` and `git diff -- packages/sample/src/App.tsx packages/sample/src/pages/Index.tsx`. Add `/poc/c06` above the catch-all route and add a C06 card without changing existing A04/A11/B10 content. Re-run both diffs afterward and confirm every pre-existing A04 hunk remains intact. Do not stage files as part of this task.

### Task 4: Verify Presentation and Build

**Files:**
- Modify only if verification reveals a C06 issue.

- [ ] **Step 1: Run focused tests and lint**

Run: `npm run test:c06 --workspace door-entrance-sample`
Run: `npm run lint --workspace door-entrance-sample`

- [ ] **Step 2: Run production build**

Run: `npm run build --workspace door-entrance-sample`

- [ ] **Step 3: Start the production preview**

Run: `npm run preview --workspace door-entrance-sample -- --host 127.0.0.1`

- [ ] **Step 4: Inspect and capture in browser**

Check `/poc/c06` at 1440x900 and 390x844. Capture the start, tunnel crossing, and finish states, and inspect each for texture coverage, exposed edge faces, receiving-space visibility, and framing.
