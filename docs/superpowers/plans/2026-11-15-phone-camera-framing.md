# Phone Camera Framing Implementation Plan

> Execute inline using superpowers:executing-plans; user authorized implementation of the recommended scope.

**Goal:** Temporary independent phone framing for human/AI communication.

**Architecture:** Validated flat phone framing overrides produce a camera-only alternate configuration. Renderer selects by logical short side and applies projection offsets after responsive fitting. React owns temporary per-preset draft state only.

**Tech Stack:** TypeScript, Three.js, React, node:test, Playwright.

- [x] Add failing core tests in camera-authoring.test.ts for phone merge, validation, snapshot and non-camera invariance; run targeted node test.
- [x] Add resolver/type in core/cameraAuthoring.ts; export through index.ts. Keep supported-anchor validation in presetAnimation pipeline.
- [x] Add failing browser coverage in camera-authoring.test.ts for phone-only effect, inheritance, invalid input, Reset/layout/traversal/Restore/reload and fullscreen resize.
- [x] Wire optional phoneFraming through vanilla preview overrides, alternate camera config and resize rendering. No public preset or animation set changes.
- [x] Wire WorkbenchDraft and CameraAuthoringPanel, including blank inheritance, explicit labels, unsupported states and snapshot copies.
- [x] Run relevant core/package/browser tests, lint/build; inspect local sample. Document actual evidence and sync #72/#58/#63 without changing source completion counts.
- [x] Request independent review, address findings, mark completed tasks. Preserve existing uncommitted work; do not merge or publish.

## Verification notes

- Spec/plan reviewed and approved. Independent implementation review found an unnecessary config-identity cache invalidation on seek; replaced it with shared/phone scope tracking and reviewer approved.
- Core red: both new phone tests failed because resolver was missing. Green: focused10/10, full145 core,2 local assets,4 animation oracle tests; package16/16.
- Browser red: new phone controls absent. Green: phone-only raw renderer image comparisons, blank inheritance, invalid input retention, Reset/layout/traversal/Restore/reload, plus actual camera pose and projection for both offset signs and paused fullscreen rotation. Related browser suites23/23 pass.
- Lint passes with3 existing Fast Refresh warnings. Library build and sample production build pass. Extra sample tsc still reports the same3 pre-existing errors (animationId narrowing and React inert types); no new errors.
- T3 collaborative preview loaded the new controls, but its snapshot endpoint failed and requestAnimationFrame remained paused despite visible state. Actual interactive and rendered checks therefore use the repository's Playwright tests; this is not evidence of source-video fidelity.
- No source tracks, registry, original media, baselines or released presets changed by phone authoring. No commit/merge/publication.
- Final visual/asset regression43/43 passed under the existing desktop full-sheet and portrait protected-phase comparison contract. Baselines were not regenerated. #72/#58/#63 synchronized; Project remains In Progress,8/35 unchanged.

## Delivery verification

Fresh pre-merge checks passed:145 core,2 local assets,4 numeric/asset oracle,16 package,85 full browser and43 visual/asset regression tests; lint/build pass. UI evidence is `docs/images/camera-authoring-phone-framing-2026-11-15.png`.

An additional check of the real Pages command exposed a missing-export failure against published beta.5. A separate fixer isolated the panel and new helper in a DEV-calibration-only lazy wrapper, preserving synchronous validation. Source and beta.5 builds now pass; the published build's module report contains neither authoring modules nor workspace library/assets. Sample node tests32/32 pass. The fix changes the sample module boundary only; renderer/core checks remain valid. Final affected browser checks are recorded in the delivery PR. No npm publication is included.
Final module-boundary regression:10/10 affected browser tests pass (authoring5,device comparison4,production gating1). Independent review of the committed delivery head is recorded in the PR.
