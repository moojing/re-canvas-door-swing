# Renderer and CI cleanup implementation plan

> For agentic workers: use superpowers:subagent-driven-development. User authorized both changes and subagents/worktrees.

**Goal:** Enforce sample type safety in PR verification, then separate renderer responsibilities without changing API or animation behavior.

**Architecture:** Keep the vanilla mounting entry and public exports stable. Extract internal scene/door geometry, camera framing and audio ownership behind focused modules. Move existing computations and sequencing literally; do not alter authored tracks, texture lifecycle policy, responsive fitting, timing, or baselines as part of this extraction.

**Tech Stack:** TypeScript, Three.js, React18, npm workspaces, GitHub Actions, Node22.23+, Playwright.

## Task 1: Typecheck and CI (isolated chore/typecheck-ci)
- [ ] Reproduce sample tsc errors.
- [ ] Fix animation ID narrowing and type React18 inert while retaining DOM behavior.
- [ ] Add sample typecheck to normal validation/build; expose root command.
- [ ] Add pull_request workflow for npm ci, lint, build, core and package checks on Node22.23+; retain beta deployment. Do not run macOS-arm64 visual baseline on Linux.
- [ ] Verify lint/build/core/package, independently review and commit.

## Task 2: Internal renderer extraction (refactor/renderer-and-ci)
- [ ] Verify baseline core/package; cherry-pick Task1 after review.
- [ ] Move VanillaDoorScene and door geometry into internal renderer modules; move responsive fitting/cache into a focused camera collaborator using geometry callbacks.
- [ ] Extract audio element, gesture unlocking, generations, media events, source synchronization, playback window and timers into audio controller. Keep animation RAF and public lifecycle coordination in vanilla.ts.
- [ ] Retain public signatures/export names, callbacks, gesture timing, camera fit invalidation and cleanup order. No new public subpaths or controller redesign.
- [ ] Run lint/build/core/package, full functional browser and frozen visual/numerical regressions without baseline refresh; inspect local sample.
- [ ] Independent spec and code review, fix findings and rerun relevant checks.

## Delivery
- [ ] Record local implementation/test evidence. No preset/calibration changes or new source completion counts. No publication/merge requested.
- [ ] Leave completed work in the isolated integration branch with worktree path and exact verification results.
