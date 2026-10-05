# 1996–1999 released preset timing calibration

This note supports [issue #58](https://github.com/moojing/re-canvas-door-swing/issues/58). The source of truth for the videos and classification remains the sibling `re-door-gallery` repository; no original media or frame extracts are shipped in the library. Observations came from the [gallery camera review](https://github.com/moojing/re-door-gallery/blob/main/docs/door-camera-era-review-2026-10-02.md), the exact local MP4s listed below, 0.1-second contact sheets, and `ffmpeg blackdetect=d=0.2:pix_th=0.07`. Blackdetect locates the first visible segment and next black transition, not the game engine's own animation boundaries.

The five source clips all include more than one passage or surrounding game footage. Only their **first ordinary door passage** is fitted here. Absolute file times are approximate to 0.1–0.2 seconds. The captured pixels do not uniquely determine 3D camera position, opening angle, or whether a brief nearly static interval is mathematically motionless. Those values in `packages/door-lib/src/core/animationStyles.ts` are visual fitting parameters.

| Preset | Exact local MP4 beneath `re-door-gallery/materials/door-transitions/` | GIF | First visible segment | Observed action in file time | Next black |
| --- | --- | --- | ---: | --- | ---: |
| 1996 A-1 iron | `1-1/a01/a01-s1鐵門.mp4` | [view](https://github.com/moojing/re-door-gallery/blob/main/selection-gifs/1-1/a01-001.gif) | 1.87 s | Slight opening ~5.1; pause/very slow ~5.2–5.5; renewed opening after 5.6; fade near 6.6 | 6.63 s |
| 1996 A-2 yellow panel knob | `1-1/a02/a02-s5黃目字門.mp4` | [view](https://github.com/moojing/re-door-gallery/blob/main/selection-gifs/1-1/a02-005.gif) | 1.33 s | Handle before opening; slight opening ~5.0; slow interval ~5.1–5.4; renewed opening after 5.5 | 6.56 s |
| 1996 B-2 blue panel double | `1-1/b02/b02-s5日型鐵門.mp4` | [view](https://github.com/moojing/re-door-gallery/blob/main/selection-gifs/1-1/b02-005.gif) | 1.47 s | Slight opening ~4.9; slow interval ~5.0–5.4; both leaves open further after 5.5 | 6.40 s |
| 1998 A-1 no handle | `1-2/a01/a01單門-無把手.mp4` | [view](https://github.com/moojing/re-door-gallery/blob/main/selection-gifs/1-2/a01-001.gif) | 2.87 s | Slight opening ~4.7–4.9; pause/very slow ~5.0–5.7; renewed opening after 5.8; visible passage after 6.3 | 7.23 s |
| 1999 A-1 parking | `1-3/a01/a01-s2停車場門.mp4` | [view](https://github.com/moojing/re-door-gallery/blob/main/selection-gifs/1-3/a01-002.gif) | 1.19 s | Closed hold ~3.5–4.3; continuous opening ~4.4–5.2; passage ~5.3–5.9; no confirmed long post-open pause | 5.96 s |

## Runtime phase values

Times below start at the first visible door segment, not at MP4 zero. The first implementation rounds durations and phase boundaries to editable millisecond values. `slight-open` is the small nonzero angle; `hold-end` ends its visible pause. The parking profile instead has `closed-hold-end` while angle remains zero.

Held-door profiles also mark `opening-start` 0.18 s before `slight-open`. This is the beginning of the fitted small-angle movement and, for the two no-knob presets, the sound-window start. For knob presets, `handle-start` is the sound-window start. Both are editable, named anchors in the detail preview.

| Preset | Duration | Approach end | Slight opening / closed wait end | Hold end | Full opening | Passage | Fade start |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1996 A-1 | 4.80 s | 2.10 s | 3.30 s | 3.70 s | 4.30 s | 4.50 s | 4.60 s |
| 1996 A-2 | 5.20 s | 2.75 s | 3.70 s | 4.10 s | 4.70 s | 4.90 s | 5.00 s |
| 1996 B-2 | 4.90 s | 2.50 s | 3.50 s | 4.00 s | 4.55 s | 4.70 s | 4.78 s |
| 1998 A-1 | 4.40 s | 1.00 s (fixed composition) | 2.00 s | 2.85 s | 3.60 s | 4.00 s | 4.25 s |
| 1999 A-1 | 4.80 s | 2.30 s | 3.10 s (closed) | — | 4.05 s | 4.30 s | 4.60 s |

The 1996 A-2 knob begins at 3.00 s and reaches its fitted maximum at 3.55 s; the B-2 knobs begin at 2.75 s and reach maximum at 3.35 s. The knob angle of 65° remains the existing model behavior, not a reference measurement. The fitted camera Z tracks and the default sound source crop of 6–36% are engineering choices for the existing scene and sound asset. The same cropping amount across profiles is provisional; visual and auditory review can adjust it without changing the observation table.

The parking MP4 also contains a reverse passage. This implementation keeps PR #59's viewer-relative swing metadata and preview toggle; publishing a paired fixed reverse-traversal preset still needs separate front/back, handle, and hinge QA. Running and automatic sliding doors are intentionally outside this first set of profiles.
