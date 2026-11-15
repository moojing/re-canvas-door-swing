# Renderer and CI cleanup implementation plan

> For agentic workers: use superpowers:subagent-driven-development. User authorized both changes and subagents/worktrees.

**Goal:** Enforce sample type safety in PR verification, then separate renderer responsibilities without changing API or animation behavior.

**Architecture:** Keep the vanilla mounting entry and public exports stable. Extract internal scene/door geometry, camera framing and audio ownership behind focused modules. Move existing computations and sequencing literally; do not alter authored tracks, texture lifecycle policy, responsive fitting, timing, or baselines as part of this extraction.

**Tech Stack:** TypeScript, Three.js, React18, npm workspaces, GitHub Actions, Node22.23+, Playwright.

## Task 1: Typecheck and CI (isolated chore/typecheck-ci)
- [x] Reproduce sample tsc errors.
- [x] Fix animation ID narrowing and type React18 inert while retaining DOM behavior.
- [x] Add sample typecheck to normal validation/build; expose root command.
- [x] Add pull_request workflow for npm ci, lint, build, core and package checks on Node22.23+; retain beta deployment. Do not run macOS-arm64 visual baseline on Linux.
- [x] Verify lint/build/core/package, independently review and commit.

## Task 2: Internal renderer extraction (refactor/renderer-and-ci)
- [x] Verify baseline core/package; cherry-pick Task1 after review.
- [x] Move VanillaDoorScene and door geometry into internal renderer modules; move responsive fitting/cache into a focused camera collaborator using geometry callbacks.
- [x] Extract audio element, gesture unlocking, generations, media events, source synchronization, playback window and timers into audio controller. Keep animation RAF and public lifecycle coordination in vanilla.ts.
- [x] Retain public signatures/export names, callbacks, gesture timing, camera fit invalidation and cleanup order. No new public subpaths or controller redesign.
- [x] Run lint/build/core/package, full functional browser and frozen visual/numerical regressions without baseline refresh; inspect local sample.
- [x] Independent spec and code review, fix findings and rerun relevant checks.

## Delivery
- [x] Record local implementation/test evidence. No preset/calibration changes or new source completion counts. No publication/merge requested.
- [x] Leave completed work in the isolated integration branch with worktree path and exact verification results.


## Verification and delivery evidence (2026-11-15)

Implemented on `refactor/renderer-and-ci` in `.worktrees/architecture-cleanup`.
CI changes were implemented separately on `chore/typecheck-ci` and cherry-picked
as `d1f622d`. Both tasks received independent specification and code-quality
reviews; the final fixture/documentation delta was also approved.

- `npm run lint`: passed; three existing React Fast Refresh warnings remain.
- `npm run build`: passed; existing sample chunk-size warning remains.
- `npm run test:lib:core`: 145 behavior, two local-assets and four frozen numeric/assets checks passed.
- `npm run test:lib:package`: 16 passed. Existing source assertions now read the module owning the checked code, without changing their expressions.
- Existing sample animation helper tests: six passed; focused navigation/inert browser checks: four passed for the CI task.
- `DOOR_TEST_URL=http://127.0.0.1:5373 DOOR_CALIBRATION_TEST_URL=http://127.0.0.1:5377 DOOR_PRODUCTION_TEST_URL=http://127.0.0.1:4376 npm run test:lib:browser`: 85 functional tests and 43 visual/assets checks passed on isolated servers. The earlier default-port run was stopped and is not counted as evidence.
- Before extraction, all 43 visual/assets checks passed as well. The frozen oracle and authored core/asset files were not changed. Historical portrait comparison retains its documented protected-phase scope; this does not certify source-video fidelity.
- Generated `index.d.ts` and `vanilla.d.ts` are byte-identical to the saved pre-extraction declarations.
- Local collaborative preview at port5392: checked device comparison at slight opening, Play completion and Reset to zero.

`vanilla.ts` is now345 lines; scene/geometry, camera framing and audio live in
internal renderer modules. The main checkout remains unchanged. No PR, merge,
npm publication or deployment was performed; CI workflow execution on GitHub
will occur after pushing/opening a PR. No Phase1 source-completion count changed.
