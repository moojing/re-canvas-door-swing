# Developer Animation Verify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sample-only `/dev/animations` pages that inspect one published animation and switch among presets that share it.

**Architecture:** Keep grouping in a sample helper over `doorAnimationConfigs` and `doorEntrancePresets`. List and verifier pages stay out of the library. The client catalog at `/` does not gain a Dev link.

**Tech Stack:** React Router, `mountDoorEntrance`, Node test runner

---

### Task 1: Animation preset helper

**Files:**
- Create: `packages/sample/src/dev/animationPresets.ts`
- Create: `packages/sample/src/dev/animationPresets.test.ts`

- [x] Write failing tests for known-animation check, presets grouped by animation, first-preset fallback, mismatched-preset fallback, and empty animation.
- [x] Implement the helper and make the tests pass.

### Task 2: Routes and pages

**Files:**
- Create: `packages/sample/src/pages/DevAnimationList.tsx`
- Create: `packages/sample/src/pages/DevAnimationVerifier.tsx`
- Create: `packages/sample/src/pages/devAnimationRoutes.test.mjs`
- Modify: `packages/sample/src/App.tsx`
- Modify: `packages/sample/src/pages/Index.header.test.mjs`

- [x] Lock `/dev` → `/dev/animations`, verifier route, 404 for unknown animation, and no `/dev` link in the catalog header.
- [x] Add the list and verifier pages. Verifier remounts `mountDoorEntrance({ preset })`, keeps Play/Reset/timeline, and does not mount when no presets exist.
- [x] Run helper + route tests, `npm run lint`, and a browser pass of `/dev/animations` plus `/`.
