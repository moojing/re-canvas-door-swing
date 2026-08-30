# Phase 1 A02 Knob Door Design

## Source

Implement the Phase 1 A02 source variant selected by the user:

- `1-1/a02/a02-s5黃目字門.mp4`
- Gallery category: `鉸鏈單開 × 喇叭鎖`
- Visual summary: aged yellow-brown wood panel door with three horizontal inset panels and a round brass knob on the viewer's right side of the front face.

The sibling `re-door-gallery` repo remains the source of truth for classification records, thumbnails, videos, and frame extracts. Runtime assets created for this implementation must be original generated library assets, not copied frame grabs.

## Implementation

Reuse the existing `direct-entry` / `hinge-single` animation. No new animation config is required for this source because the movement is the same single-hinge inward push already implemented for A01.

Add one released preset:

- `biohazard-1996-a02-yellow-panel-knob-door`
- label: `1-1 A-2 Yellow Panel Knob Door`
- type: `single`
- motion: `hinge-single`
- material: aged wood panel
- animation: `direct-entry`
- hinge side: `left`
- handle profile: `knob-round`
- handle model: `packages/door-lib/src/assets/models/door_knob.glb`

Generate original front and back WebP door textures at the current door texture ratio. The front texture should place the knob/lock plate on the right side. The back texture should place the knob/lock plate on the left side so both faces describe the same physical handle location through the door.

Use the imported `door_knob.glb` asset for the A02 round knob. The model is a CC-BY-4.0 Sketchfab asset and must be documented in `packages/door-lib/src/assets/models/ATTRIBUTION.md`. Keep procedural round-knob geometry in the vanilla renderer as a fallback for failed or missing imported models.

## Verification

- Core preset tests must assert the A02 preset metadata, front/back texture URLs, handle profile, and inclusion in the Phase 1 registry.
- Renderer/package tests must assert that `knob-round` keeps procedural fallback geometry, and handle-model tests must cover single-mesh imported knob fallback.
- Browser catalog tests must expect the A02 card on the sample home page.
- Visual QA must inspect closed, half-open, and open states for handle side, back-face symmetry, and reasonable edge material.
