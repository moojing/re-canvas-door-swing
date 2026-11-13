# Internal cameraPath extraction (#72 Stage2)

Approved task: after frozen regression baselines are committed, begin the internal camera-path architecture while preserving existing animation. The user-facing editor/templates/traversal-sharing/persistence stages are deferred. This branch builds on baseline commit 2bb103e; delivery status is tracked by the corresponding PR.

## Design

`CameraPath` groups readonly position and target keyframe tracks, using the existing millisecond TimelineKeyframe/TimelineEasing interpolation and warpTime. It owns no duration, phase scheduler, door/handle/fade/audio state, IDs, registry or public API. The complete animation profile owns duration/events and a cameraPath. Reusable module functions validate, sample and retime a path without mutating original data; sample results retain public cameraPosition/cameraTarget state fields.

Migrate every existing authored profile literally, with no numeric/easing/event changes. A derived profile overriding only position explicitly retains its base path's target. Existing distinct Iron Enter/Leave paths stay distinct, existing set-sharing remains; do not infer new shared links. Camera-only editing UI and phase adapters are outside this pure migration.

## Steps and validation

- [x] Run frozen baseline/core checks before changes.
- [x] Write failing CameraPath tests: vector validation, same existing interpolation, clamped sampling/new tuples, phase retiming retaining easing, mutation isolation, and complete-profile retiming keeping leaf/audio/fade synchronized.
- [x] Implement internal cameraPath.ts using existing sampleTrack/validateTrack/warpTime.
- [x] Migrate animationStyles.ts data; adapt profileState.ts and presetAnimation.ts validation/retiming; update only internal raw-profile shape assertions in existing tests.
- [x] Verify all2082frozen numerical samples and all42PNG phase sheets against the unchanged old commit; NEVER refresh the oracle to accommodate this refactor. Existing18behavior tests, core/package/lint/build must pass.
- [x] Independent read-only review, fix findings, rerun affected tests. Document the internal boundary, deferred #72 stages and local status. No npm release or new source count; PR delivery is separately authorized.

Expected files: new core/cameraPath.ts and __tests__/camera-path.test.ts; modify core/{animationStyles,profileState,presetAnimation}.ts and internal assertions in animation-sets.test.ts. No renderer, public exports/types, sample UI, preset registry or baseline changes.

## Result

Internal extraction implemented on refactor/internal-camera-path; PR state records delivery. No npm publication. All14literal pre-extraction profiles match after flattening the internal wrapper, including every keyframe/value/easing/event and audio/fade field (audit /tmp/camera-path-literal-audit.log). The4frozen numeric/assets checks and42PNG phase sheets pass without baseline edits. Full browser coverage65+43 passes, including decode guard;133core+2assets and16package tests pass. Lint/build and diff whitespace checks pass (3existing lint warnings). Independent reviewer found no issues and independently passed all5new CameraPath tests. Stage1 editor and Stage3 sharing/templates/persistence remain deferred.
