# Door Swing Social Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Lovable social metadata and tooling with a project-owned catalog preview.

**Architecture:** Keep social metadata in the sample HTML and serve one static
`1200x630` PNG from the sample public directory. Add one focused Node test that
locks the metadata, image dimensions, and complete removal of Lovable.

**Tech Stack:** Vite, Node test runner, Playwright screenshot CLI, npm workspaces

---

### Task 1: Lock the social-preview contract

**Files:**
- Create: `packages/sample/social-preview.test.mjs`
- Modify: `packages/sample/package.json`

- [x] Create a Node test using `node:test`, `node:assert/strict`, and
  `node:fs/promises`. Read `index.html`, `vite.config.ts`, the sample and root
  package manifests, `package-lock.json`, and `public/social-preview.png`.
- [x] Assert these exact HTML values:
  - `og:title`: `Retro Horror Door — Playable Door Animation Presets`
  - `og:description`: `Browse and play reusable retro-horror 3D door entrance presets built with Three.js.`
  - `og:image` and `twitter:image`: `https://moojing.github.io/re-canvas-door-swing/social-preview.png`
  - `og:image:alt` and `twitter:image:alt`: `Retro Horror Door preset catalog`
- [x] Parse PNG bytes `16..23` as big-endian IHDR width/height and assert
  `[1200, 630]`.
- [x] Join the HTML, config, manifests, and lockfile and assert it does not
  match `/lovable/i`.
- [x] Add
  `"test:social-preview": "node --test social-preview.test.mjs"` to the sample.
- [x] Run
  `npm run test:social-preview --workspace retro-horror-door-sample`.
  Expected: FAIL because old metadata, Lovable references, and the PNG remain.

### Task 2: Remove Lovable and install project metadata

**Files:**
- Modify: `packages/sample/index.html`
- Modify: `packages/sample/vite.config.ts`
- Modify: `packages/sample/package.json`
- Modify: `package-lock.json`

- [x] Replace generated metadata with the exact values from Task 1 and keep
  `twitter:card=summary_large_image`.
- [x] Remove the author/Twitter metadata that identifies Lovable.
- [x] Change Vite plugins to `plugins: [react()]` and remove the tagger import.
- [x] Run `npm uninstall lovable-tagger --workspace retro-horror-door-sample`
  to update both the sample manifest and root lockfile.
- [x] Run the focused test again. Expected: FAIL only because
  `public/social-preview.png` is absent.

### Task 3: Capture and verify the catalog image

**Files:**
- Create: `packages/sample/public/social-preview.png`
- Create: `packages/sample/scripts/capture-social-preview.mjs`

- [x] Create `capture-social-preview.mjs` using `chromium` from
  `@playwright/test`. It accepts the URL as `process.argv[2]`, creates a
  `1200x630` page, navigates with `waitUntil: "networkidle"`, awaits
  `document.fonts.ready`, then waits for every
  `[role="img"][aria-label$="animation preview"]` to contain a non-zero canvas.
  After that condition, await three nested `requestAnimationFrame` callbacks
  so every mounted renderer has completed initial-frame work. Assert no visible
  `[role="dialog"]`, scroll to `[0, 0]`, and call:
  `page.screenshot({ path: fileURLToPath(new URL("../public/social-preview.png", import.meta.url)), type: "png" })`.
- [x] Run `npm run dev` in one terminal.
- [x] Run
  `node packages/sample/scripts/capture-social-preview.mjs http://127.0.0.1:5173/`
  in another terminal. Expected: writes the PNG and exits 0.
- [x] Stop the development server.
- [x] Run `npm run test:social-preview --workspace retro-horror-door-sample`.
  Expected: PASS.
- [x] Run `npm run lint`.
  Expected: exit code 0.
- [x] Run `npm run build`.
  Expected: exit code 0 and `packages/sample/dist/social-preview.png`.
- [x] Inspect the final image at social-card size and confirm it contains no
  third-party branding.

Do not create a git commit unless the user explicitly requests one.
