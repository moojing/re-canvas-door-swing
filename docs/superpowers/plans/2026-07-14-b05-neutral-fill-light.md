# B05 Neutral Fill Light Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the B05 gate slightly more visible by adding one subtle neutral front fill light without changing its material or black environment.

**Architecture:** Keep all existing procedural texture, material, geometry, and motion modules unchanged. Modify only the React Three Fiber scene lighting in `ArchedGateB05.tsx`, then verify the closed and opening states visually against the approved black-background design.

**Tech Stack:** React 18, React Three Fiber, Three.js, Vite, Node test runner.

---

### Task 1: Add and verify the neutral fill light

**Files:**
- Modify: `packages/sample/src/poc/ArchedGateB05.tsx`

- [ ] **Step 1: Record the visual baseline**

Start or reuse the Vite server:

```bash
npm run dev
```

Open `http://127.0.0.1:5173/poc/b05` at progress `0`. Confirm the floor plane is absent, the background is black, and the existing gate is darker than requested.

- [ ] **Step 2: Add the minimal scene light**

Add one neutral directional light after the existing warm key light:

```tsx
<directionalLight position={[0, 3, 6]} intensity={0.22} color="#d8d3cc" />
```

Do not change `createAgedIronTexture`, `IronBox`, `CanonicalArchedLeaf`, `GateFrame`, the existing light values, or the black scene environment.

- [ ] **Step 3: Run automated regression checks**

Run:

```bash
npm run test:b05
npm run lint
npm run build
git diff --check
```

Expected: 24 B05 tests pass, lint has no errors, the production build completes, and the diff check exits zero. Existing unrelated Fast Refresh, A11/B10 Three.js, and bundle-size warnings may remain.

- [ ] **Step 4: Verify the rendered result**

Reload `http://127.0.0.1:5173/poc/b05` and inspect progress `0` and an opening state around `0.5`.

Expected:

- rust and relief detail are slightly easier to see;
- gate frame and leaves retain the same material style;
- no orange outline appears;
- the canvas remains black with no visible floor or side-wall boundary;
- animation controls and camera motion still work.

- [ ] **Step 5: Commit the lighting change**

```bash
git add packages/sample/src/poc/ArchedGateB05.tsx
git commit -m "fix: clarify b05 gate with neutral fill"
```
