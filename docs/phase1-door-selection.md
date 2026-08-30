# Phase 1 Door Selection Notes

The Phase 1 selection records remain owned by the sibling `../re-door-gallery`
repository. Do not copy the gallery export, report, source videos, frame
extracts, or estimation CSV into this package repository.

Local review source used while implementing the first runtime preset:
`/Users/mujingtsai/Downloads/door-selection-2026-08-25-first-bio123.json`

Export metadata inspected during implementation:

- Exported at: `2026-08-25T06:21:39.429Z`
- Selected count: `35`
- Selected groups: `20`
- Selection rule confirmed during review: no selected category should contain
  more than three doors.

Implementation plan:
`docs/superpowers/plans/2026-08-27-phase1-door-presets.md`

## Runtime Asset Notes

| Preset | Runtime asset | Provenance |
| --- | --- | --- |
| `biohazard-1996-a01-iron-door` | `packages/door-lib/src/assets/textures/biohazard-1996-a01-iron-door-front.webp` and `packages/door-lib/src/assets/textures/biohazard-1996-a01-iron-door-back.webp` | Original generated 1:2 albedo-style front texture created for the Phase 1 `1-1/a01/a01-s1鐵門.mp4` reference selection, using the local gallery thumbnail, the user-provided handle crop, and approved concept direction only as visual references. The back texture is an authored horizontal mirror of the generated front so the handle appears on the opposite side. The runtime assets are WebP q85 exports; PNG files are retained only as local/source masters while this preset is still in development. These are not copied frames or source-game assets. |
| `biohazard-1998-a01-no-handle-door` | Reuses the `biohazard-1996-a01-iron-door` WebP textures | Runtime mirror of the same A01 door material for the Phase 1 `1-2/a01/a01單門-無把手.mp4` reference selection. The preset sets the single hinge on the right and mirrors the front/back texture mapping so the visible handle-like plate appears on the opposite side without duplicating identical image assets. |
| `biohazard-1996-a02-yellow-panel-knob-door` | `packages/door-lib/src/assets/textures/biohazard-1996-a02-yellow-panel-knob-door-front.webp`, `packages/door-lib/src/assets/textures/biohazard-1996-a02-yellow-panel-knob-door-back.webp`, and `packages/door-lib/src/assets/models/door_knob.glb` | Original generated 1:2 aged yellow wood-panel texture created for the stakeholder featured Phase 1 `1-1/a02/a02-s5黃目字門.mp4` reference selection. The back texture is an authored horizontal mirror of the generated front so the round knob appears on the opposite visible side. Runtime texture assets are WebP q85 exports. The knob uses the imported CC-BY `door_knob.glb`; see `packages/door-lib/src/assets/models/ATTRIBUTION.md`. |

## Implemented Runtime Presets

| Source category | Preset | Status |
| --- | --- | --- |
| 鉸鏈單開 × 無配件 | `biohazard-1996-a01-iron-door` | Implemented for `1-1/a01/a01-s1鐵門.mp4`; left hinge, texture not mirrored. |
| 鉸鏈單開 × 無配件 | `biohazard-1998-a01-no-handle-door` | Implemented for `1-2/a01/a01單門-無把手.mp4`; right hinge, mirrored from the same A01 runtime textures. |
| 鉸鏈單開 × 喇叭鎖 | `biohazard-1996-a02-yellow-panel-knob-door` | Implemented for `1-1/a02/a02-s5黃目字門.mp4`; left hinge, generated front/back textures, imported round knob model with procedural fallback. |
