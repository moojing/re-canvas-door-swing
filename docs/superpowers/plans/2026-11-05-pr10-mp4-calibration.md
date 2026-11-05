# PR #10 MP4 calibration implementation plan

**Goal:** Fit the three existing S9 / iron-window animation sets to the local MP4 evidence reviewed with the user; retain a runnable local comparison.

**Approved scope:** The user requested implementation after reviewing the source-comparison report and proposed corrections: S9 mid-shot size/placement and iron-window Enter/Leave framing/passage. Use the existing preset/set architecture. Renderer fits are not recovered source-engine parameters. Preserve hardware, turn directions, sound crop, public IDs and unrelated presets.

**Architecture:** Adjust only the three assigned profiles in `packages/door-lib/src/core/animationStyles.ts`. Use explicit shared camera/leaf tracks, with projected geometry regressions in core and actual-render checks in the existing browser suite. Keep source MP4s, frames and fitting scripts under the gallery's ignored materials directory.

**Tech stack:** TypeScript, Three.js, node:test, existing Playwright suite, T3 shared preview, ffmpeg/Python for local source inspection.

- [x] Create a clean worktree from current main, install dependencies, read calibration/reference contracts.
- [x] Establish source/runtime alignment uncertainty from MP4 events before fitting; retain source seconds and runtime milliseconds separately.
- [x] Derive approximate source silhouette landmarks at closed, micro/hold, opening and passage; verify baseline failures before profile edits.
- [x] Fit S9's fixed already-open leaf and accelerating camera against multiple source samples; preserve acceleration and absence of invented handle/audio phases.
- [x] Fit iron-window closed placement, perspective and later traversal independently for Enter/Leave; preserve observed knob direction and pause unless MP4 evidence requires retiming.
- [x] Add actual-render silhouette/placement assertions at matched times, distinguishing geometric disappearance from fade; test S9 mid-shot and iron-window closed/micro/opening/late Leave.
- [x] Run core and relevant browser regressions, package checks, lint and builds. Compare actual renders at matched source times and verify reset/seek/traversal controls.
- [x] Record new source observations in the gallery and fitted values/local-only status in swing calibration/progress docs. Check gallery consistency and report any pre-existing ignored-frame inventory mismatch without rewriting manifests.
- [x] Obtain independent code review, resolve substantive findings, update affected online progress tracking as required by AGENTS.md, and leave the candidate local preview running. No merge/publication requested.
