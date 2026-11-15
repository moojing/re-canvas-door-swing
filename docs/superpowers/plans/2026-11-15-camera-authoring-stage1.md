# Camera authoring Stage1 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Author-only controls for existing preset framing, camera hold/pace and coordinated pre-opening wait, with temporary drafts and exact Restore.

**Architecture:** Extend the existing temporary preview override pipeline, never registry profiles or mount selection. A core authoring module validates settings, resolves supported phase anchors and derives camera state; shared waiting reuses complete-profile phase retiming. The sample owns draft UI and fixed reference/device viewports. Production builds expose no authoring panel.

**Tech Stack:** TypeScript, vanilla Three renderer, React sample, Node core tests, Playwright browser tests.

Approved scope: docs/camera-path-stage1-decisions-2026-11-15.md and #72. No templates, traversal sharing, persistence/export, source calibration, release or new source counts.

## Task 1: Temporary authoring model

Files: core/cameraAuthoring.ts, core/presetAnimation.ts, core/__tests__/camera-authoring.test.ts.
- [x] Write failing tests for identity, projection including off-center/cropped shots, invalid settings, camera-only isolation, wait retiming/audio tail, unsupported running-door wait and registry isolation.
- [x] Run focused tests to observe failures.
- [x] Implement explicit set adapters: approach-end or closed-wait, handle-start/opening-start/closed-hold-end. Running set has no closed framing/wait support.
- [x] Project closed geometry (height6, renderer leaf width/depth) through60-degree perspective; solve dolly distance along view ray, retaining target. Framing is reference-landscape projection, not portrait fit. Blend initial/approach dolly corrections back to zero at end.
- [x] Camera hold is additional initial camera-only delay; pace changes time progression within the remaining fixed duration, preserving the terminal sample. Explain that it redistributes pace, not total duration. No draft means exact authored state.
- [x] Additional pre-opening wait stretches the supported closed interval and shifts later phases/end/audio together using existing retiming machinery; no second scheduler.
- [x] Run focused tests then core regressions.

## Task 2: Preview pipeline and workbench

Files: vanilla.ts, index.ts, sample pages/{AnimationPreviewWorkbench,DeviceAnimationPreview}.tsx, sample/components/CameraAuthoringPanel.tsx.
- [x] Add browser acceptance tests before implementation: panel gate, edit/seek/reset/restore, full screen, compare, traversal isolation and invalid draft last-valid preview.
- [x] Validate new overrides before mutating playback; pause on edit, preserve elapsed time and synchronize audio.
- [x] Add dev-calibration-only panel with friendly set label, initial/approach height, camera hold, pace, shared pre-opening wait and explanatory text. Disable incompatible controls with reason. Keep advanced existing event editor.
- [x] Keep page-session drafts per preset across traversal switches; never share implicitly. Reset preserves draft, Restore clears current preset only. Reload clears drafts.
- [x] Author single viewport uses fixed reference1280x800; device comparison preserves elapsed progress and overrides. Device views are responsive checks, not forced equal framing.

## Task 3: Verify and document

- [x] Run npm run lint, npm run build, npm run test:lib:core, npm run test:lib:package, npm run test:lib:browser.
- [x] Inspect local calibration app through T3 preview, capture screenshot and verify controls, Restore and comparison.
- [x] Independent code review; fix actionable findings and rerun affected checks.
- [x] Update #72/#63 and docs/phase1-door-progress.md with local-only status; verify Project remains In Progress, source counts unchanged. Do not commit/publish/merge without delivery request.

## Verification result

Local, uncommitted/unmerged/unpublished on feat/ticket-72-camera-authoring-stage1. 141core+2assets+4baseline checks,16package,67full browser,43visual/asset baselines passed (no oracle regeneration). Final portrait-draft cache correction reproduced in a failing test;7affected authoring/device tests,lint and16package passed after correction. Independent reviews approved projection/draft snapshot and cache fixes. Sample standalone tsc reports3pre-existing narrowing/inert errors; normal lint/build checks pass. #72/#63/Project and repository progress synchronized;8/35 unchanged.
