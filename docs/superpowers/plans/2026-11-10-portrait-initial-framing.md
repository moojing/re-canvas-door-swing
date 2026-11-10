# Portrait initial framing

User-directed refinement to device comparison: automatically fit initially complete doors on narrow portrait playback containers. The same renderer behavior applies to comparison and actual playback; no device-name or browser-width switch.

## Design

- Use the authored opening frame at reference aspect 1280/800 to distinguish intentional crop from crop introduced by a narrow container. Leave an initially cropped reference unchanged.
- For an initially complete door that becomes cropped in portrait, fit its real panel corner projections inside 92% of the viewport. Already complete portrait views remain unchanged. Move the camera backward along its initial viewing axis only as much as necessary. Existing fitted camera targets, preset IDs, leaf/handle/sound/fade tracks and source completion counts remain.
- Smoothly reduce this extra displacement to zero by the authored approach-end event (or first positive event if no approach event exists). The camera rejoins the authored path with zero additional velocity at the join.
- Fit from stable panel geometry, not asynchronously loaded accessory bounds. Cache the result and recalculate on config, direction, pan or aspect changes. Resize must redraw a paused preview too.
- This is responsive renderer presentation, not a new reference calibration; gallery source observations and manifests remain untouched.

## Steps

- [x] Add failing geometry and transition tests plus a real browser regression for portrait initial clipping.
- [x] Implement private responsive-framing helper and integrate with vanilla renderer and resize.
- [x] Verify reference-cropped exemptions, initial margins, both traversals, approach join, seek/Reset and resize.
- [x] Run core/package/browser, lint/build; independent code review; inspect in shared T3 preview and leave server running.
- [x] Document behavior and verification; preserve local branch without release or merge.

## Verification — 2026-11-10

- Reproduced B07 clipping in a failing real-browser regression before integration. Geometry tests first reproduced missing pullback/join behavior; another regression prevents moving an already complete near-edge view.
- 125 core plus 2 local-asset tests,16 package tests and62 full browser tests passed. New portrait coverage verifies five affected presets/traversals, Reset and a paused landscape/portrait resize round trip with identical actual canvas screenshots and no Reset/Seek in between.
- Lint passes with zero errors and three existing Fast Refresh warnings; library/sample builds pass with existing Browserslist/bundle warnings.
- Shared T3 preview inspected B07 before/after initial framing, then actual playback to100%, audio completion (paused,volume0,no media error) and Reset. Server remains on port5174.
- Independent design/code review approved. Its paused-resize verification gap was addressed and confirmed in follow-up review.
- No source observations, presets, animation-set tracks, source completion counts or gallery materials changed. Local branch only; no merge or package publication.
