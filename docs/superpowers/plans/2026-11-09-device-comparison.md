# Device Comparison Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans; request independent review after implementation.

**Goal:** Compare one animation synchronously at desktop, tablet and phone sizes on its detail page.

**Architecture:** A sample-only preview component owns handles, logical viewport scaling and synchronized controls via an imperative ref. Desktop is the master timeline; followers seek to its progress and never play sound. The existing workbench retains settings and controls.

**Tech Stack:** React, TypeScript, Three.js vanilla library, Tailwind, Playwright.

## Task 1 — Browser specification

- [x] Add `packages/door-lib/tests/browser/device-comparison.test.ts` covering comparison mode, logical sizes, shared playback/seek/reset and single audio playback, traversal, mode switches and narrow-screen layout.
- [x] Run the focused spec against a dedicated worktree server; confirm failure because comparison mode is absent.

## Task 2 — Preview component and controls

- [x] Create `packages/sample/src/pages/DeviceAnimationPreview.tsx` owning single/comparison mounts, ResizeObserver scaling, readiness, cleanup and imperative play/stop/reset/seek/override methods. Followers use `soundUrl: ""`; primary progress seeks them before updating React state.
- [x] Modify `AnimationPreviewWorkbench.tsx` to use the preview ref, add single/compare buttons and widen comparison layout. Preserve settings, traversal, timeline and full screen controls.
- [x] Verify focused tests pass, including comparison rendering while playing and after lifecycle changes.

## Task 3 — Regression, review and handoff

- [x] Document sample comparison in `packages/sample/README.md`.
- [x] Run sample typecheck, lint, build, core/package checks and full browser regression with isolated ports.
- [x] Request independent review and fix substantive findings.
- [x] Inspect the real comparison screenshot and browser-verified narrow layout; leave its server running at port 5174. Shared T3 preview opening was attempted but returns Authentication required; provide the direct URL.
- [x] Report local branch/worktree and validation; no merge/publication requested.

## Verification results

- Independent spec/plan and implementation review approved; the requested audio-playback assertion was added.
- Browser regression: 57/57 passed, including four new comparison scenarios.
- Core: 121 plus 2 local asset tests passed; package: 16 passed; sample navigation/header: 10 passed.
- Lint: zero errors, three existing Fast Refresh warnings. Library/sample build passed with existing bundle/Browserslist warnings.
- Additional standalone sample TypeScript check reports three existing errors (animation ID narrowing and two React inert typings), reproduced from an unchanged baseline snapshot; no new errors.
- Real preview screenshot confirms all three logical viewport ratios; mobile stacking and overflow were verified by browser tests.
- Local only on feat/device-comparison; no package release, push, PR or merge.
