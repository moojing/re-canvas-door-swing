# A04 Wet Parking Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `1-2 a04` POC original-feeling, damp underground-parking material treatment for both door variants using CC0 PBR source maps.

**Architecture:** Store four low-resolution CC0 source maps in the sample app's public texture directory. `A04DoorPoC.tsx` loads each colour and roughness map once, applies variant-specific tinting and map repetition, and retains primitive geometry plus the existing shared opening animation.

**Tech Stack:** React 18, React Three Fiber, Three.js `TextureLoader`, Vite public assets, Poly Haven CC0 PBR maps.

---

### Task 1: Add source maps and provenance

**Files:**
- Create: `packages/sample/public/textures/a04/metal-plate-02-diffuse.jpg`
- Create: `packages/sample/public/textures/a04/metal-plate-02-roughness.jpg`
- Create: `packages/sample/public/textures/a04/green-metal-rust-diffuse.jpg`
- Create: `packages/sample/public/textures/a04/green-metal-rust-roughness.jpg`
- Create: `packages/sample/public/textures/a04/README.md`

- [ ] Download 1K diffuse and roughness maps from Poly Haven's `metal_plate_02` and `green_metal_rust` asset pages.
- [ ] Record the original asset URLs, CC0 license URL, and the intended s1/s2 treatment in `README.md`.
- [ ] Confirm the images have non-zero dimensions and are present in the Vite public directory.

### Task 2: Wire the PBR maps into the PoC

**Files:**
- Modify: `packages/sample/src/poc/A04DoorPoC.tsx`

- [ ] Add a small texture-loading helper that sets `SRGBColorSpace` for diffuse maps, repeat wrapping for both map types, and a damp vertical repeat appropriate to the door proportions.
- [ ] Create s1 and s2 materials from the public maps; use warm brown tint for the barred door and desaturated cold-green/charcoal tint for the solid door.
- [ ] Apply the materials to panels, rails, bars, and frame members without adding repeated full-width diagonal scratch patterns.
- [ ] Add a subtle low-positioned damp light treatment to support the underground parking interpretation.

### Task 3: Verify the visual result

**Files:**
- Verify: `packages/sample/src/poc/A04DoorPoC.tsx`

- [ ] Run `npm run lint --workspace door-entrance-sample`.
- [ ] Run `npm run build --workspace door-entrance-sample`.
- [ ] Open `/poc/a04`, inspect closed s1 and s2 plus an opening state, and verify both texture URLs load without browser errors.
- [ ] Confirm the visual review criteria: irregular corrosion/paint wear is visible, no repetitive diagonal line field remains, and both variants still have readable door geometry.
