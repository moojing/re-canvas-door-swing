# Unified Animation Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicate interactive preview surfaces with one animation detail page and add a live, local-only swing direction control.

**Architecture:** Keep published presets as the source of truth. Extend the vanilla mounted handle with a narrow `setPreviewOverrides` method that redraws the current frame, then use that method from the existing animation detail route. Navigate both the catalog and animation list to that route with validated preset selection and a safe return destination.

**Tech Stack:** TypeScript, Three.js, React, React Router, Node test runner, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-10-04-unified-animation-preview-design.md`

---

### Task 1: Live preview overrides in the vanilla library

**Files:**
- Modify: `packages/door-lib/src/vanilla.ts`
- Modify: `packages/door-lib/src/index.ts`
- Modify: `packages/door-lib/src/core/__tests__/variants.test.ts` only if preset assertions need extension
- Modify: `packages/door-lib/src/__tests__/package-boundary.test.ts`
- Modify: `packages/sample/src/sample/vanillaEntry.ts` (test-mode API bridge)
- Test: `packages/door-lib/tests/browser/vanilla-smoke.test.ts`

- [x] Add a failing browser test that seeks a single door to a half-open frame, applies a new `swingDirection` through a test-mode bridge to the mounted handle, and verifies the canvas changes without resetting progress or replacing the canvas. Cover restoring `{}`.
- [x] Run the focused Playwright test using the local sample server and confirm it fails for missing preview override behavior.
- [x] Add `DoorPreviewOverrides` with `swingDirection?`, export it, and add `setPreviewOverrides(overrides)` to `DoorEntranceHandle`. Store override state per mounted instance; replace it on each call and redraw current progress.
- [x] Use the override direction or the authored preset direction; default missing directions to `toward-viewer`. Keep the fixed 90-degree opening angle and double-door rotation unchanged.
- [x] Run focused browser, core, and package tests; confirm the canvas is stable, progress is retained, and old behavior still passes.
- [x] Commit the focused library change with a conventional message.

### Task 2: Unify navigation and remove the duplicate modal

**Files:**
- Modify: `packages/sample/src/pages/Index.tsx`
- Modify: `packages/sample/src/pages/DevAnimationList.tsx`
- Modify: `packages/sample/src/pages/DevAnimationVerifier.tsx`
- Delete: `packages/sample/src/pages/PresetDetailModal.tsx`
- Modify: `packages/door-lib/tests/browser/preset-catalog.test.ts`
- Modify: `packages/sample/src/pages/devAnimationRoutes.test.mjs` if route-level assertions change

- [x] Rewrite the affected browser tests to assert that catalog Open navigates to the animation detail route with the requested preset, list navigation selects a valid default, invalid/mismatched preset IDs fall back within the animation, and Back returns to the source or animation list on direct visit.
- [x] Run the focused browser tests and confirm the new navigation expectations fail against the modal-based UI.
- [x] Replace catalog `onOpen` modal state with a React Router link or navigation carrying `from: "/"`; keep full-screen transition as a separate action.
- [x] Have the animation list carry `from: "/dev/animations"`; validate return state in the detail page, preserve it when changing the preset query, and add the Back link.
- [x] Remove the unused modal once its playback/timeline features are present on the detail page.
- [x] Run focused browser and sample checks; commit the navigation change.

### Task 3: Storybook-like detail controls

**Files:**
- Modify: `packages/sample/src/pages/DevAnimationVerifier.tsx`
- Modify: `packages/door-lib/tests/browser/preset-catalog.test.ts`

- [x] Add a failing browser test for the selected single-door preset that seeks to a frame, changes Swing direction, observes the control value and a changed canvas without progress reset, then restores the authored value. Assert the direction control is absent for the double door.
- [x] Run the focused test and confirm it fails because the controls are missing.
- [x] Make the detail player a preset-keyed child so changing presets initializes control state from the new authored preset. Keep fixed metadata and the released usage snippet separate from preview-only controls.
- [x] Wire the two-option direction toggle to `setPreviewOverrides` and implement Restore preset values. Preserve Play, Reset, timeline seek, and sound-after-gesture behavior.
- [x] Run focused tests and visually inspect both A-1 presets at closed, half-open, and fully-open positions in the local sample.
- [x] Commit the UI change.

### Task 4: Final verification

**Files:**
- Review all changed files and the spec; edit only if tests or visual inspection show a gap.

- [x] Run `npm run test:lib:core`, `npm run test:lib:package`, `npm run lint`, `npm run build`, and browser coverage with the local Vite URL (or an approved local-network execution if sandboxing blocks localhost).
- [x] Run `git diff --check`, inspect the branch diff and Git status, and confirm the pre-existing unrelated plan file was not staged or changed.
- [x] Leave a working local preview URL open and report the branch, tests, remaining warnings, and any limitation. Do not create a PR unless requested.
