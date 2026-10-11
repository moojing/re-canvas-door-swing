# Phase 1 Door Selection Notes

35 支影片逐支進度：[線上總覽 #63](https://github.com/moojing/re-canvas-door-swing/issues/63) · [repo 對照表](phase1-door-progress.md)。

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
| `biohazard-1996-a01-iron-door` | `packages/door-assets/textures/biohazard-1996-a01-iron-door-front.webp` and `packages/door-assets/textures/biohazard-1996-a01-iron-door-back.webp` | Original generated 1:2 albedo-style front texture created for the Phase 1 `1-1/a01/a01-s1鐵門.mp4` reference selection, using the local gallery thumbnail, the user-provided handle crop, and approved concept direction only as visual references. The back texture is an authored horizontal mirror of the generated front so the handle appears on the opposite side. The runtime assets are WebP q85 exports; PNG files are retained only as local/source masters while this preset is still in development. These are not copied frames or source-game assets. |
| `biohazard-1998-a01-no-handle-door` | Reuses the `biohazard-1996-a01-iron-door` WebP textures | Runtime mirror of the same A01 door material for the Phase 1 `1-2/a01/a01單門-無把手.mp4` reference selection. The preset sets the single hinge on the right and mirrors the front/back texture mapping so the visible handle-like plate appears on the opposite side without duplicating identical image assets. |
| `biohazard-1999-a01-parking-door` | `packages/door-assets/textures/biohazard-1999-a01-parking-door-front.jpg` and `packages/door-assets/textures/biohazard-1999-a01-parking-door-back.jpg` | Original 887×1774 q85 JPEG parking-door textures created from the reviewed `1-3/a01-002.gif` and thumbnail’s broad material and hardware direction. The front rotary mechanism is viewer-right and its back counterpart viewer-left, representing the same physical location. These are not copied frames or source-game assets. |
| `biohazard-1996-a02-yellow-panel-knob-door` | `packages/door-assets/textures/biohazard-1996-a02-yellow-panel-knob-door-front.webp`, `packages/door-assets/textures/biohazard-1996-a02-yellow-panel-knob-door-back.webp`, and `packages/door-lib/src/assets/models/door_knob.glb` | Original generated 1:2 aged yellow wood-panel texture created for the stakeholder featured Phase 1 `1-1/a02/a02-s5黃目字門.mp4` reference selection. The back texture is an authored horizontal mirror of the generated front so the round knob appears on the opposite visible side. Runtime texture assets are WebP q85 exports. The knob uses the imported CC-BY `door_knob.glb`; see `packages/door-lib/src/assets/models/ATTRIBUTION.md`. |

## Implemented Runtime Presets

| Source category | Preset | Status |
| --- | --- | --- |
| 鉸鏈單開 × 無配件 | `biohazard-1996-a01-iron-door` | Implemented for `1-1/a01/a01-s1鐵門.mp4`; left hinge, texture not mirrored. |
| 鉸鏈單開 × 無配件 | `biohazard-1998-a01-no-handle-door` | Implemented for `1-2/a01/a01單門-無把手.mp4`; right hinge, mirrored from the same A01 runtime textures. |
| 鉸鏈單開 × 無配件 | `biohazard-1999-a01-parking-door` | Implemented for `1-3/a01/a01-s2停車場門.mp4`; left hinge, authored olive-steel surfaces and the shared `direct-entry` timeline. Uses `1999-single-closed-wait-advance`; the return traversal remains unimplemented. |
| 鉸鏈單開 × 喇叭鎖 | `biohazard-1996-a02-yellow-panel-knob-door` | Implemented for `1-1/a02/a02-s5黃目字門.mp4`; left hinge, generated front/back textures, imported round knob model with procedural fallback. |
| 鉸鏈雙開 × 喇叭鎖 | `biohazard-1996-b02-blue-panel-double-door` | Implemented representative for `1-1/b02/b02-s3方塊門.mp4`; this change delivers single-active-leaf camera/sound calibration; package publication remains separate. |

### Parking-door motion reference (2026-09-26)

The gallery's preview button resolves this child to
`selection-gifs/1-3/a01-002.gif`: 104 frames, 6.25 fps, 16.64 seconds.
Decoded with macOS ImageIO and inspected as a complete contact sheet, with
frames 8–38 also inspected individually in sequence. The clip includes gameplay
and two opposite-direction door transitions; it is not a 16.64-second entrance.
The first entrance approaches the closed leaf, pauses, then swings the leaf
about the left edge and passes through. At this preview resolution the gray
disc's horizontal grip shows no discernible independent rotation before opening.
This observation, rather than the gallery's accessory classification alone,
supports the static hardware treatment. Finer motion cannot be ruled out from
the 6.25 fps preview. The rear surface is authored, not an exact reconstruction.

Historical implementation at 2026-09-26 used the existing five-second `direct-entry` timeline and did
not reproduce the reference's closed-door approach and pause. Those timing
differences were addressed by the later era animation sets (PR #60). The door reuses
single-leaf geometry and the shared retro shader. Source frames stay outside
the package. The local browser run verified rendering, playback, seeking, and
resetting against this PR branch; the screenshot in `docs/images/` shows the
halfway state.

## B02 double-door representative

- Ticket #37: `1-1/b02/b02-s3方塊門.mp4` now has the runtime preset `biohazard-1996-b02-blue-panel-double-door`.
- Uses the `double-swing` animation ID with the explicit `1996-double-micro-open-hold-advance` set and licensed, split `door_knob.glb`; each leaf has a knob on both faces, with fixed rectangular backplates/keyholes and rotating grips.
- New original six-panel blue-gray wood texture generated with ImageGen; WebP q85, 887×1774. One hardware-free texture is shared across front/back, with existing back UV compensation. Rear appearance is an authored counterpart, not a claim of exact game-back reconstruction.
- Source generation: `exec-e253c35e-7164-4c77-ae18-6dc75fc42ed8.png`. Runtime asset: `packages/door-assets/textures/biohazard-1996-b02-blue-panel-double-door.webp`.
- Edges sample the solid wood stile, and closed leaves retain a narrow central seam. Uses the shared soft 360p pixel treatment and existing licensed audio.
- Only the first representative in #37 is implemented; the other selected doors remain pending.
- Historical 2026-09 follow-up used a 5.5s timeline. The 2026-10-11 calibration delivered by this change lasts 5.35s: approach ends at 1.20s, left leaf starts opening at 4.32s, holds at 6° from 4.50–4.70s, and reaches 40° at 5.35s; right leaf stays closed. Fade runs 5.15–5.35s and sound runs 4.32–5.15s. These renderer fit values are not source-video timestamps. See `docs/era-animation-calibration-2026-10-05.md`; this change delivers the follow-up via [PR #64](https://github.com/moojing/re-canvas-door-swing/pull/64); merge state follows the PR, and package publication remains pending.

B02 的顯示效果補充（2026-09-09）：依本機原片的柔化亮邊與移動邊線觀感，
在投影座標加入半個渲染像素的格點量化，並對門板貼圖加入四向取樣的輕微
柔化與中高亮度的中性提亮。這是視覺近似，並非已確認原遊戲使用的技術。
量化使用場景自身的 drawing buffer 尺寸，resize 時同步更新；不使用時間或
亂數，因此暫停時不會自行震動。效果目前限於 B02，保持 360px 與平滑放大。

## Ticket synchronization (2026-10-11)

The registry contains five base doors and two Leave variants (seven runtime
presets). Only the three no-accessory single-door selections are fully covered
as a selected category. The yellow A02 S5 is a representative implementation,
not completion of the originally selected S9 running door. Double-knob coverage
contains only B02 S3. Other accessory categories and sliding, vertical, and
folding categories remain unimplemented. Final Phase 1 verification remains open.

Recommended next mechanism: #41, center-split automatic sliding, starting with
`1-1/b07/b07-s1雙門自動門.mp4`. It requires independent leaf translation and
a reference-calibrated camera/sound/fade set; it has no accessory geometry.
The two later elevator selections remain separate follow-ups.
