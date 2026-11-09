# Device Comparison Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans; request independent review after implementation.

**Goal:** Compare one animation synchronously at desktop, tablet and phone sizes on its detail page.

**Architecture:** A sample-only preview component owns handles, logical viewport scaling and synchronized controls via an imperative ref. Desktop is the master timeline; followers seek to its progress and never play sound. The existing workbench retains settings and controls.

**Tech Stack:** React, TypeScript, Three.js vanilla library, Tailwind, Playwright.

## Task 1 — Browser specification

- [ ] Add `packages/door-lib/tests/browser/device-comparison.test.ts` covering comparison mode, logical sizes, shared playback/seek/reset and single audio playback, traversal, mode switches and narrow-screen layout.
- [ ] Run the focused spec against a dedicated worktree server; confirm failure because comparison mode is absent.

## Task 2 — Preview component and controls

- [ ] Create `packages/sample/src/pages/DeviceAnimationPreview.tsx` owning single/comparison mounts, ResizeObserver scaling, readiness, cleanup and imperative play/stop/reset/seek/override methods. Followers use `soundUrl: ""`; primary progress seeks them before updating React state.
- [ ] Modify `AnimationPreviewWorkbench.tsx` to use the preview ref, add single/compare buttons and widen comparison layout. Preserve settings, traversal, timeline and full screen controls.
- [ ] Verify focused tests pass, including comparison rendering while playing and after lifecycle changes.

## Task 3 — Regression, review and handoff

- [ ] Document sample comparison in `packages/sample/README.md`.
- [ ] Run sample typecheck, lint, build, core/package checks and full browser regression with isolated ports.
- [ ] Request independent review and fix substantive findings.
- [ ] Open the comparison page in the shared T3 preview, inspect desktop and narrow layout, and leave its server running.
- [ ] Report local branch/worktree and validation; no merge/publication requested.
