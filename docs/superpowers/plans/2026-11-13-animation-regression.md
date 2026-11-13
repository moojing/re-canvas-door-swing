# Frozen animation regression baseline

Approved scope: add the missing old/new regression protection described in the conversation; do not change runtime animation. Use main commit `1b3f83de9ca4ed77fb8e21fcb0c58b7213358910` as the first oracle.

## Implementation

- [x] Add a source-root-independent timeline collector under `packages/door-lib/tests/regression/`. Capture all 12 catalog and 2 retired compatibility presets, configuration/audio metadata, 40ms state samples and event boundaries ±1ms. Capture event/quarter-phase visual timestamps too.
- [x] Add a core `.test.ts` that compares current output to a committed JSON oracle, reports field/time mismatches, checks registry coverage and never writes baselines.
- [x] Add a Playwright `.test.ts` that captures actual rendered frames at the frozen timestamps for desktop1440×900, tablet768×1024 and phone390×844. Composite the native drawing buffer and actual fade opacity into lossless contact sheets without resizing or text. Compare PNG snapshots and preserve expected/actual/diff artifacts via the HTML report.
- [x] Add an explicit baseline capture script requiring a full existing commit and reason. Extract that immutable commit into a fresh temporary directory, install its locked dependencies, run its runtime server, and use the test collector to capture into staging. Record source SHA, tree, asset/code hashes, Node/Playwright/Chromium/platform and viewport/sampler settings. Only replace committed baseline files after a successful complete capture. Ordinary tests reject snapshot-update flags and missing or modified baseline artifacts.
- [x] Prove the first comparison passes on unchanged runtime; deliberately perturb camera/timing and visual snapshots to prove failures and reports without updating the oracle, then revert the probes. Run core, focused browser, package, lint and build checks. Document normal checks and intentional refresh/review procedure, limits (sampled frames, platform rasterization, no proof of original audio fidelity), and provenance.

## Files and validation

New: timeline collector/comparator and tests, baseline capture script, timeline JSON + provenance/hashes + 42 PNG sheets, dedicated browser config/read-only guard, regression README. Modify root npm scripts/core test discovery only as needed; keep runtime/sample files unchanged.

Run `npm run test:animation:core`, `npm run test:animation:visual`, `npm run test:animation`, and existing `npm run lint`, `npm run build`, `npm run test:lib:core`, `npm run test:lib:package`.

No commit, push, PR, merge, deployment or package publication requested in this turn.

## Review clarifications

- Both capture and comparison servers are fresh (`reuseExistingServer:false`); oracle source, assets and dependencies come from the extracted commit's own locked install. Record Git tree and hashes, and check the served vanillaEntry module against the oracle tree.
- Freeze Chromium/software SwiftShader flags, DPR1, sRGB/light scheme, reduced motion; sampled time comes only from seek, never wall-clock playback. Fail on asset/network/page errors, wait for network completion and stable rendered pixels after assets settle; no arbitrary sleeps.
- Freeze the exact14 preset IDs,40ms samples,event±1ms boundaries and visual timestamp ordering. Numeric comparisons use absolute1e-10 tolerance; PNG comparisons use pixel threshold0.1 with zero allowed differing pixels. Missing snapshots and --update-snapshots fail during ordinary tests.
- Existing vanilla-smoke/device-comparison/controller/sound-window tests cover play/resume/reset/seek/completion callbacks and gesture/audio synchronization. This adds frozen outputs and audio-window metadata, not an assertion of original audio-waveform fidelity. Run these existing checks alongside the new suite before delivery.

## Verification evidence

- Oracle generated from archived main1b3f83d with its own locked install. Repeat capture with a poisoned external DOOR_PACKAGE_ENTRY passed; timeline and42PNG hashes were identical to the initial capture.
-4numeric/asset-integrity tests and43browser regression/harness cases pass;18existing vanilla/device behavior tests pass.128core+2local-assets and16package tests pass;lint/build pass with existing warnings.
- Real Blue camera source mutation7.6→8.2 failed both numeric and visual checks; expected/actual/diff artifacts and field/time JSON were emitted. Probe restored byte-for-byte; runtime and sample source trees remain unchanged.
- Snapshot-update guard rejected writes. HTTP200 corrupt GLB guard rejected a hidden decode failure. Independent implementation review findings about environment isolation and decoded-model readiness were fixed and re-reviewed with no remaining findings.
- Evidence logs: /tmp/animation-final-core.log, /tmp/animation-final-check.log, /tmp/animation-behavior.log, /tmp/animation-real-probe-{core,visual}.log. No commit/push/merge performed.
