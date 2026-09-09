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

## B02 double-door representative

- Ticket #37: `1-1/b02/b02-s3方塊門.mp4` now has the runtime preset `biohazard-1996-b02-blue-panel-double-door`.
- Reuses the existing `double-swing` timeline and licensed, split `door_knob.glb`; each leaf has a knob on both faces, with fixed rectangular backplates/keyholes and rotating grips.
- New original six-panel blue-gray wood texture generated with ImageGen; WebP q85, 887×1774. One hardware-free texture is shared across front/back, with existing back UV compensation. Rear appearance is an authored counterpart, not a claim of exact game-back reconstruction.
- Source generation: `exec-e253c35e-7164-4c77-ae18-6dc75fc42ed8.png`. Runtime asset: `packages/door-lib/src/assets/textures/biohazard-1996-b02-blue-panel-double-door.webp`.
- Edges sample the solid wood stile, and closed leaves retain a narrow central seam. Uses the shared soft 360p pixel treatment and existing licensed audio.
- Only the first representative in #37 is implemented; the other selected doors remain pending.
- Follow-up: B02 knob turn matches A02 in elapsed time: starts at 0.7s, reaches 65° at 1.75s, with the same smoothstep curve and settling phase. The 5.5s double-door timeline remains unchanged.

B02 的顯示效果補充（2026-09-09）：依本機原片的柔化亮邊與移動邊線觀感，
在投影座標加入半個渲染像素的格點量化，並對門板貼圖加入四向取樣的輕微
柔化與中高亮度的中性提亮。這是視覺近似，並非已確認原遊戲使用的技術。
量化使用場景自身的 drawing buffer 尺寸，resize 時同步更新；不使用時間或
亂數，因此暫停時不會自行震動。效果目前限於 B02，保持 360px 與平滑放大。
