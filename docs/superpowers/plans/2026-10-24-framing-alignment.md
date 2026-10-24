# Framing Alignment Implementation Plan

> Execute inline using executing-plans; the user has approved starting the preceding design and calibration scope.

**Goal:** Match closed framing and initial approach of existing sets to local source evidence.
**Architecture:** Edit shared camera tracks in animationStyles.ts, preserving registry boundaries and authored late motion/audio; verify screen projection, not raw Z.
**Tech Stack:** TypeScript, Three.js, Node test, Vite, Playwright.

- [x] Baseline: `npm run test:lib:core` in this worktree.
- [x] Add `packages/door-lib/src/core/__tests__/framing-alignment.test.ts`: projected width/top/center/crop ranges at initial and stable hold; sliding still approaches1600–1900ms; ensure stable fixed profiles. Run focused test and observe failures before changing production code.
- [x] Fit cameraPosition/cameraTarget in `packages/door-lib/src/core/animationStyles.ts`; preserve independent angle, handle, sound, fade tracks and late endpoints; fit sliding intermediate camera samples to continuous approach. Keep parking conservative and source justified.
- [x] Update superseded old projection assertions in animation-sets/sliding/browser tests to current source-evidenced behavior; retain late motion/navigation/sound checks.
- [x] Run core/package/lint/build. Use source sample on a separate free port and inspect real leaves/handles at0, approach-end, micro-hold, opening, passage, fade. Compare all11 presets against gallery frames; refine fits and add focused browser regression for closed bounds.
- [x] Run browser suite with isolated sample/calibration/production ports; fix regressions and review diff.
- [x] Update latest calibration record, animation set docs and Phase1 local status; synchronize #63 affected rows, category Source Doors and Project statuses while preserving online source counts and publication state. Run gallery consistency check and report existing96-frame inventory discrepancy without rewriting inventory.
- [x] Independent code review; address findings, record final validation and preview URL. Do not merge/publish automatically.


Completed on current main3d000c4, preserving its Blue6.90s profile and newer presets. Baseline89+2 passed;18 new framing regressions passed after observed failures (initial13 mismatches, then Parking and no-handle passage separately). Final112+2core/assets,16package,47browser,lint/build pass; independent review approved. Online synchronization verified. Gallery inventory check retains the pre-existing96-frame mismatch. Worktree stays local/unpublished for review.
