# Camera-path authoring and traversal sharing

Status: design proposal / backlog. Record this design now; implement in a later task.

## Problem

Current animation sets combine camera position/target, door-leaf movement, handle movement, sound windows and picture fade. Eight registered sets include seven used by the current catalog and one legacy yellow-door compatibility set. Their era/motion/source-oriented IDs are useful internally but difficult for users choosing a camera movement.

Enter/Leave belongs to complete presets. The iron door uses different sets for its traversals; the grid door and B07 currently share their respective sets. Only available, registered traversal variants are selectable. Enter/Leave does not imply toward/away rotation or a reversed camera path.

The editor should let a user adjust camera framing and movement without learning each full set ID or maintaining duplicate Enter/Leave settings.

## Recommended design

Separate the authoring concepts while retaining a complete, validated runtime preset:

- `cameraPath`: camera position, look-at target and interpolation over time. It does not own leaf angles/translations, handles, sound or picture fade.
- `animationSet`: the complete coordinated timeline, using a camera path together with the other tracks and common phase timing.
- `preset`: an internally valid door/material/hardware/traversal combination assigned to an animation set.

Authoring can change a temporary camera path. Saving/releasing must resolve it into a complete valid preset/set. Keep `mountDoorEntrance({ target, preset })`, existing IDs, React-free library boundaries and random filtering behavior compatible. This proposal does not authorize a public API for arbitrarily mixing motion, handles and materials.

## User experience

Show two main choices: available traversal and camera movement. Give camera paths friendly names, hiding internal set IDs in an advanced/debug section.

Start with three proposed camera templates:

1. Fixed wait, then advance.
2. Approach, wait, then advance.
3. Continuous approach, with optional slower movement during the wait.

These describe camera behavior, not door-opening mechanics. Template parameters must reproduce the selected profile's behavior before replacing its authored camera track. Do not flatten distinct source paths merely to fit three labels; retain a custom/authored option when needed. Initial delay is a parameter rather than another template.

Basic controls:

- Initial projected door height as a percentage of the viewport.
- Initial camera hold duration.
- Projected door height after approach; values above100% explicitly represent cropping.
- Camera wait duration and advance pace/easing.

Use percentages for framing instead of exposing scene-space Z to ordinary users. Resolve percentages through actual door geometry, active projection/aspect and look-at settings; apparent height is a fit, not a recovered source-engine distance. Define whether framing changes continue to maintain the selected percentage on viewport resize.

Keep picture fade and audio-tail controls in an adjacent ending/timing section owned by the full animation set. Their controls are not camera-path data. Advanced authoring may expose camera position/look-at keyframes later; unrestricted lateral/orbit paths are outside the first stage.

## Enter/Leave sharing

Default to one shared authoring camera setting for a preset's available traversal pair. Offer "apply to both directions" and "only this direction".

Sharing is explicit metadata, not automatic merging of existing profiles. Iron's currently different Enter/Leave camera paths must remain distinct on migration. For a pair with a shared setting, a direction-specific override takes precedence without changing the other direction. Returning to shared settings removes the override. Switching traversal preserves the intended draft edits; Reset only resets playback, while Restore discards the relevant draft settings. Exact restore/apply wording needs UI validation.

A single-direction preset stays single-direction. Shared camera settings never create a missing Leave preset, infer rotation direction or claim an unverified reverse source is calibrated.

## Timeline coordination

Use a shared phase model such as initial hold, approach, closed wait, opening/micro-open hold, advance/passage and fade. Paths bind relevant keyframes to supported phase anchors rather than copying absolute milliseconds from a different set.

Existing event IDs differ between sets. Define explicit adapters for those IDs and detect missing/ambiguous anchors. Not every animation has every phase. For a preset, offer only compatible templates or request an explicit custom mapping; do not silently map incompatible phases.

Distinguish changing camera behavior inside the existing timing from changing common phase timing. Camera-only edits preserve leaf/handle/audio/fade timing. Editing a common phase duration intentionally retimes every affected track, sound window and audio fade together. The existing timing editor's sampling/retiming machinery is the starting point, not a second scheduler.

## Staged delivery

### Stage1: simplify the editor using existing animation sets

Provide friendly camera choices and a small framing/hold/pace panel in the authoring workbench. Derive temporary camera overrides from the selected existing set; other authored tracks and preset selection remain intact. Preserve each preset's current appearance when first loaded or restored. Prototype the UI before committing to a new storage/public schema.

### Stage2: extract internal camera-path data

Factor current camera position/target tracks into an internal reusable representation. A complete set resolves its camera track alongside the other timeline tracks. Initially represent every current authored path exactly, even when several paths share a friendly template family. Preserve existing set IDs, preset IDs, profile defaults, timing, source calibration and playback behavior.

### Stage3: reusable templates, traversal sharing and persistence

Add explicit shared settings/directional overrides, compatibility validation and versioned draft storage/export. Saved authoring data can produce a complete validated preset/set; define registration and release review before enabling public persistent custom presets. Decide separately whether the deployed site exposes this editor or remains a released-preset preview.

Stage1 is the recommended first implementation. Each stage should be independently reviewable; avoid implementing the entire architecture in one refactor.

## Alternatives considered

- Friendly labels alone: smallest change, but does not support meaningful camera editing or reduce duplicated direction settings.
- Full extraction/templates/persistence immediately: cleaner complete model upfront, with greater migration/UI/release risk.
- Staged authoring-first approach: chosen to validate the controls while preserving calibrated playback and public compatibility.

## Validation and error handling

Reject non-finite coordinates/targets, impossible framing, invalid phase order, missing anchors, unsupported template/preset combinations and empty/non-monotonic track time ranges. Show actionable validation in the editor and preserve the last valid preview. Validate camera results through playback: no unexpected clipping, path discontinuities or premature loss of the door before the intended fade.

Keep Play, Reset, seek, Back, full-screen preview, gesture-based sound, mobile layout and traversal switching working. Test that shared edits affect only explicitly linked directions and a direction override does not mutate a global profile or another preset. Restore must reconstruct the exact original authored profile.

Library/catalog changes require relevant core/package/browser tests plus lint. Camera changes also require local visual/source comparison; passing projection tests alone does not establish source fidelity. Capture migration regressions for the existing initial/hold/opening/passage/fade frames before extracting paths.

## Acceptance criteria for the later work

- [ ] Stage1 shows friendly camera behavior and basic framing/hold/pace controls while keeping the selected preset and available traversal clear.
- [ ] Initial load/Restore reproduce the current calibrated preset; editing one preset does not mutate shared registry objects.
- [ ] Camera-only changes preserve other tracks; common timing edits keep camera, leaf, handle, audio and fade synchronized.
- [ ] Enter/Leave sharing and overrides are explicit, with existing distinct paths preserved and missing directions not fabricated.
- [ ] Templates reject incompatible/missing phase bindings with understandable feedback.
- [ ] Public preset usage/IDs, legacy compatibility and React-free package boundaries remain valid.
- [ ] Existing playback/navigation/full-screen/mobile behavior is verified; source-driven camera changes have visual evidence.
- [ ] Stage2/3 persistence/schema/public-editor decisions are approved before their implementation.

## Decisions to resolve before implementation

- Is the editor for project authors, end users of the sample, or library consumers? Stage1 assumes an authoring workbench; production exposure needs an explicit decision.
- Should the first stage use only preset-specific framing/hold controls or also offer template switching immediately?
- How should percentage framing behave across viewport resize and asymmetric look-at targets?
- What draft persistence/export format and custom-preset registration flow are needed in Stage3?
- How should source observations identify whether Enter/Leave may share a camera setting?

## Existing code and related work

- `packages/door-lib/src/core/animationStyles.ts`: authored camera/leaf/handle/fade/sound profiles.
- `packages/door-lib/src/core/animationSets.ts`: explicit sets and compatibility/default resolution.
- `packages/door-lib/src/core/presetAnimation.ts`: profile validation and phase retiming.
- `packages/door-lib/src/vanilla.ts`: rendering/playback and temporary preview overrides.
- `packages/sample/src/pages/`: animation detail/workbench and timing editor.
- `docs/animation-style-1996.md` and latest sections of `docs/era-animation-calibration-2026-10-05.md`.
- Related tickets: #58 (animation/source QA), #24 (preset boundary), #63 (35-source overview).

This is a shared authoring/design task, not a new source-video implementation. It does not change the6/35 completed-source count or mark any missing animation/direction completed. Future preset/set changes must synchronize the affected category, #63, repository progress and Project status.
