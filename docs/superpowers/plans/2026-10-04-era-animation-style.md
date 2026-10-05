# Era Animation Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the five released 1996–1999 door presets individually calibrated approach, opening, hold, passage, and fade timing without changing their mechanical `motion` or public preset selection API.

**Architecture:** A preset owns an `animationStyle` era and resolves to one internal, absolute-time animation profile. Pure track samplers create door, handle, camera, fade, marker, and sound state from the same clock. The vanilla renderer, controller, and sample detail page resolve the same config. Legacy `animation` IDs and presets without a style retain their current behavior.

**Tech Stack:** TypeScript, Three.js, React/Vite, Node core/package tests, Playwright.

**Scope:** Issue [#58](https://github.com/moojing/re-canvas-door-swing/issues/58). PR #59 already added hinge `swingDirection`, its preview toggle, and A-1 front/back alignment; do not implement those a second time. No 2000 work, running/sliding presets, new textures, or arbitrary public style/material/handle mixing.

**Execution status (2026-10-05):** The five exact clips were calibrated, and the sampler, preset resolver, shared playback/sound clock, detail-page controls, and focused tests are implemented. The final source observations are in [`docs/era-animation-calibration-2026-10-05.md`](../../era-animation-calibration-2026-10-05.md). The reverse parking-door passage is documented but remains separate direction/asset QA; no fixed reverse variant is published in this change. The checklist below records the original task sequence rather than claiming that every acceptance condition of #58 is closed.

---

## Sources and calibration rule

Use `/Users/mujingtsai/Case/BioHazard/re-door-gallery/docs/door-camera-era-review-2026-10-02.md` and its local MP4/contact sheets. In this worktree `../re-door-gallery` does **not** resolve to the gallery; that relative path only works from the original repository root. The research supports a 1996/1998 slight-open slow or held interval and a 1999 parking-door closed approach/hold followed by continuous opening. All file times below are approximate observation points; they are not engine keyframes. Select the first ordinary traversal, align local timeline zero to the first visible door frame, and record uncertainty of about 0.1–0.2 s. Door angles and camera Z are visual fitting values, not measurements from the game.

| Released preset | Original source | Distinguishing evidence |
| --- | --- | --- |
| `biohazard-1996-a01-iron-door` | `1-1/a01/a01-s1鐵門.mp4`, contact sheet `pause-001.jpg` | slight opening near file 5.1 s, slow/hold 5.2–5.5 s, renewed opening after 5.6 s, early fade near 6.6 s |
| `biohazard-1996-a02-yellow-panel-knob-door` | `1-1/a02/a02-s5黃目字門.mp4`; compare category contact sheet `pause-002.jpg` only for the shared 1996 mechanism | inspect this exact s5 clip before committing its override; do not copy s1 timing blindly |
| `biohazard-1996-b02-blue-panel-double-door` | inspect its exact source variant in `1-1/b02/`; `b02-s5日型鐵門.mp4` / `pause-013.jpg` is mechanism evidence, not proof of the blue preset's timing | two leaf tracks and knob action; slight-open interval needs exact-source check |
| `biohazard-1998-a01-no-handle-door` | `1-2/a01/a01單門-無把手.mp4`, `pause-022.jpg` | slight opening 4.7–4.9 s, slow/hold 5.0–5.7 s, renewed opening after 5.8 s; later visible passage |
| `biohazard-1999-a01-parking-door` | `1-3/a01/a01-s2停車場門.mp4`, `detail-057.jpg` | closed hold near 3.5–4.3 s, continuous opening 4.4–5.2 s, passage 5.3–5.9 s; no confirmed long post-open hold |

The sister gallery remains the only repository for source media, frame extracts, and classification records. If a source note changes, edit its gallery document and run `npm run gallery:check` from this repository. Do not package source media or gallery metadata.

## Files and boundaries

- `packages/door-lib/src/core/animationTimeline.ts`: validate and sample strictly ordered scalar and vector keyframes using absolute milliseconds and per-segment easing.
- `packages/door-lib/src/core/animationStyles.ts`: three era defaults plus full-track preset overrides; only runtime numbers and marker names.
- `packages/door-lib/src/core/presetAnimation.ts`: `getDoorEntranceAnimationConfig(preset, previewProfile?)` resolver with legacy fallback; carries named `{id,label,atMs}` events and converts their milliseconds to normalized progress for existing playback interfaces.
- `packages/door-lib/src/core/types.ts`, `presets.ts`, `controller.ts`, `src/vanilla.ts`, `src/index.ts`: style metadata, selected config, shared duration, and preview-only timing overrides.
- `packages/sample/src/pages/DevAnimationVerifier.tsx`, `AnimationPreviewWorkbench.tsx`, and `DevAnimationList.tsx`: use the preset resolver, display style/markers, and edit phase boundaries in the existing detail page. Preserve the route and Back button from PR #59.
- Focused tests under `packages/door-lib/src/core/__tests__/` and `packages/door-lib/tests/browser/`; update existing timing assertions only when deliberately superseded.

### Task 1: Finish exact-source timing sheet

- [ ] Inspect all five exact MP4 variants, using `ffprobe` and local 0.1 s frame contact sheets where boundaries are unclear. For the blue B-2 asset, first identify the source variant matching its texture.
- [ ] Record, per preset, visible start, end of closed approach, handle start/end, first slight opening, hold/slow interval end, full opening, passage start, fade start/end, and confidence. Preserve absolute MP4 time and a local-zero offset separately.
- [ ] Choose initial *fitting* camera/angle numbers and source audio crop without labeling them measured reference facts. Keep uncertainty and source URLs in this plan or a project note, not the library package.
- [ ] Verify the first and reverse parking-door passages separately for viewer-relative direction; keep PR #59's authored direction until evidence supports a change.

### Task 2: Pure track sampler (TDD)

**Files:** create `animationTimeline.ts`, `__tests__/animation-timeline.test.ts`.

- [ ] Write tests for a scalar track `[{atMs:0,value:0},{atMs:300,value:.08},{atMs:650,value:.08},{atMs:1500,value:1}]`: at 500 ms it stays `.08`, at both boundaries it is continuous, and reverse seek returns the same value. Test vector tracks, local easing, zero and final time, and invalid duration/NaN/duplicate or unordered times.
- [ ] Run `npm run test:lib:core` and verify the new tests fail for the absent sampler.
- [ ] Implement `sampleTrack(track, timeMs)` with a binary or linear segment search and clamped local `t`; repeated values create hold. Reject non-finite/out-of-range times and require endpoints at 0 and duration. Do not apply a global easing to profiles.
- [ ] Run `npm run test:lib:core` and verify the new tests pass. Commit `feat: add absolute-time door track sampler`.

### Task 3: Era defaults and preset resolver (TDD)

**Files:** create `animationStyles.ts`, `presetAnimation.ts`, their focused tests; modify `types.ts`, `presets.ts`, `controller.ts`, `index.ts`.

- [ ] Add `DoorAnimationStyleId = "biohazard-1996" | "biohazard-1998" | "biohazard-1999"` and optional `DoorEntrancePreset.animationStyle`. Assign all five released presets explicitly; do not infer year from ID.
- [ ] Write resolver tests: five style mappings; 1996/1998 slight-open value greater than zero and stable during hold; 1999 angle zero during closed hold then monotonically opens; B-2 left/right leaves; one absent-style legacy fallback; switch preset updates duration and state; invalid profile fails explicitly.
- [ ] Implement profiles as data with `durationMs`, named events, and independent tracks for `doorAngle`, optional `rightDoorAngle`, `handleAngle`, `cameraPosition`, `cameraTarget`, and `fadeOut`. Override whole tracks for door-specific timing; prevent incompatible motion/style combinations. Retain `getDoorAnimationConfig(animationId)` for old callers.
- [ ] Extend `DoorAnimationConfig` with optional `timelineEvents: Array<{id: string; label: string; atMs: number}>`. Resolve it together with `duration`, derived numeric `progressMarkers`, `soundStartProgress`, `soundEndProgress`, `soundSourceStartProgress`, `soundSourceEndProgress`, `easing: undefined`, and `getState(progress)` sampling at `progress * duration`. Keep both marker labels and the chosen source-audio crop; reuse existing knob angle amplitude but set its phase on the resolved clock.
- [ ] Update controller initialize/reset to use the preset resolver. Run core, package, and lint checks. Commit `feat: resolve released presets to era timing profiles`.

### Task 4: Vanilla playback and sound share the clock

**Files:** modify `src/vanilla.ts`, `core/soundWindow.ts` and tests, browser sound tests.

- [ ] Write browser tests that switch 1996/1999 presets and assert actual playback duration, seek/Reset frame state, sound starting after Play, and correct sound position after a seek or resumed Play.
- [ ] Change vanilla mount and preset switches to use the preset resolver. Recalculate RAF progress, render, markers, and sound windows from its duration.
- [ ] For a styled profile only, map the cropped sound span to its event window by setting `playbackRate = croppedSourceDurationMs / timelineWindowDurationMs` after media metadata is known; use that same mapping when resuming/seek. Use rate 1 for legacy, reset it on preset change, avoid non-finite rates, and pause at the window end. Preserve the Play user-gesture unlock rule.
- [ ] Run core/package/browser tests and lint. Commit `feat: play era profiles on one timeline`.

### Task 5: Detail page calibration controls

**Files:** modify `DevAnimationVerifier.tsx`, `AnimationPreviewWorkbench.tsx`, `DevAnimationList.tsx`; browser and sample route tests.

- [ ] Write browser tests for selected preset style, event markers, clicking a marker to seek, live timing control changing the current preview without writing the published preset, restoring defaults, Back navigation, Play/Reset, and existing swing toggle.
- [ ] Use the resolved preset config for the detail page duration and marker labels. Expose a bounded preview-only edit for measured phase boundaries (closed approach end, first opening, slight-open hold end, full open, passage, fade start/end); enforce increasing valid times and disable the slight-open hold field for 1999's current parking profile. Keep geometry/material/handle fixed.
- [ ] Define timing edits as a set of *named event milliseconds*, not unrelated per-track values. Include `0` and `durationMs` as fixed endpoint anchors and validate strictly increasing anchors; optional phases such as 1999's absent slight-open hold are omitted. For each original segment `[oldEventA, oldEventB]`, map all door, handle, camera, fade, and sound event times into `[newEventA, newEventB]` with the same local fraction. Regenerate the full profile and its resolved config from the warped tracks so all stages stay on one clock.
- [ ] Add `setPreviewOverrides({ swingDirection?, timingEvents? })` to the mounted preview handle or an equally narrow preview-only method. On a timing edit, stop any active RAF/audio and its scheduled sound timer, preserve the current **elapsed milliseconds** (clamped to the new duration), resolve the new config, seek/redraw that point, and leave playback paused; Play resumes against the new config. This avoids the current Play closure retaining the old duration. A swing-only change retains current progress and playback. Restore clears both overrides. No arbitrary public `mountDoorEntrance` profile selection.
- [ ] Keep `/dev/animations/:animationId?preset=...` and catalog/Animations entry points working. Run sample tests, browser tests, lint, and build. Commit `feat: inspect and tune era timing in animation detail`.

### Task 6: Visual QA, issue accounting, and final checks

- [ ] Launch `npm run dev` and inspect all five at closed, first opening, hold midpoint/end, full opening, passage, and fade. Compare aligned action points to the exact MP4s; adjust only profiles when timing differs. Confirm the 1999 parking door has no invented long post-open hold.
- [ ] Inspect A-1 front/back faces, hinge side, and handle placement for both swing directions; keep direction QA open if a fixed reverse-traversal preset is still missing. Confirm double leaves and knob motion still fit the original.
- [ ] Run `npm run test:lib:core`, `npm run test:lib:package`, `npm run test:lib:browser`, `npm run lint`, and `npm run build` after the last change. Attach screenshot or clip evidence to any PR.
- [ ] Update #58 with PR #59 groundwork and this implementation's actual completed items. Check an issue box only when its whole acceptance condition is met; leave exceptions and direction variant work open if incomplete.
