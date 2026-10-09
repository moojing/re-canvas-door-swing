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


## 2026-10-06 iron-door camera revision

The user clarified that the apparently stationary micro-opening interval still
contains a very small forward camera movement. For the 1996 a01 iron door,
replace the earlier frozen camera and full 90-degree passage with a continuous
approach: approximately 10 degrees at 3.30 s, a barely advancing camera until
3.70 s, then a faster approach while the leaf opens toward 30 degrees. Fade
begins at 4.60 s (about 28.7 degrees) and finishes at 4.80 s (30 degrees).
These angles are fitting targets approved by the user, not measurements of
original 3D scene data. Other published presets keep their earlier profiles.

Camera z falls from 9.0 initially to 6.1 at 1.20 s, 6.02 at 3.30 s, 5.98 at
3.70 s, 4.1 at fade start, and 3.95 at the end. The initial approach uses
ease-out; later samples keep position continuous and increase forward speed.
The camera target rises from y=0.2 to y=0.4 during the initial approach. Existing
marker IDs are retained for preview retiming, with iron-specific labels that
avoid implying a stopped camera or a completed passage.

Visual verification used a 640 by 400 viewport matching the source aspect ratio.
The door's visible height grows from about 59% initially to about 87% at
micro-opening, then fills the viewport vertically with its top cropped before
fade. The existing door geometry has a narrower silhouette than the reference;
this revision calibrates motion and vertical framing and does not establish
pixel-exact width parity or complete the outstanding issue #58 visual QA.

Runtime detail screenshot: [iron door before fade](images/iron-door-camera-fade-2026-10-06.png).


## 2026-10-06 Enter / Leave variants

The existing iron-door ID is Enter; `biohazard-1996-a01-iron-door-leave` is
Leave. These are application traversal names and do not identify inside/outside.
The second source transition is approximately file 10.65–15.35 s. Its viewed
handle is left and hinge right. Leave swaps the two existing texture assets,
uses the shared edge asset and geometry, and has an independently fitted timeline.

Leave lasts 4.70 s. Initial approach eases out by 1.35 s; camera continues
advancing subtly afterward. Opening begins at 3.35 s, reaches about 3 degrees
at 3.55 s, 6 at 3.65 s, 30 at 4.15 s, 48 at 4.45 s, 65 at 4.55 s, and 72 at
the end. Fade begins at 4.58 s (about 66.4 degrees). These are render-fitting
values, not original 3D measurements. The first attempt using 84–90 degrees
exposed a broad opposite face from the offset camera; the final fit instead
narrows to an edge before fading. Camera z ends at 4.2 instead of racing through
zero. No frame/floor geometry or source footage was added to the library.

In a 640 by 400 viewport, the shared model's micro-opening silhouette occupies
about 87% visible height, then clips at the top while swinging. At 4.45 s its
visible width is about 30% of the viewport; at 4.55 s it narrows to about 11%.
The source's border/geometry and widths are not matched pixel-for-pixel. This is
a first visual fit for user playback review. Full five-preset visual QA and
all front/back direction acceptance remain outstanding; issue #58 stays open.

Runtime screenshots: [Leave detail](images/iron-door-leave-detail-2026-10-06.png),
[mobile variant selector](images/iron-door-leave-mobile-2026-10-06.png).
Verification: 58 core + 2 local asset tests, 6 sample grouping tests, 15 package
checks, 32 passing broad browser cases and 3 focused passes (including the
parking case interrupted by Vite reload during calibration, plus traversal edit
reset). Lint has only the existing 3 React refresh warnings; full build passes.

## 2026-10-06 Yellow Panel Knob Door follow-up

The yellow door was still on the older held-camera/full-swing override. It now
shares Iron Enter's continuous camera approach and broad-face fade construction,
with its own knob action and stage times. Equal era labels do not imply identical
source timing, swing direction, or door silhouettes.

Reference: local gallery `materials/door-transitions/1-1/a02/a02-s5黃目字門.mp4`.
The first transition (roughly 1.33–6.56 s) has its handle on the right and swings
toward the camera; the second (roughly 9.95–14.95 s) has its handle on the left
and swings away. Both retain a broad face before the fade, unlike Iron Leave's
near-edge silhouette. Enter/Leave are application traversal names, not aliases
for the renderer's rotation sign.

Enter retains its original ID and lasts 5.20 s. Initial approach ends at 1.20 s;
the camera continues a subtle advance while the knob acts at 3.00–3.55 s.
Micro-opening reaches 10 degrees at 3.70 s, accelerates after 4.10 s, reaches
25 degrees at 4.70 s, and fades at 5.00–5.20 s while approaching 30 degrees.
Leave uses `biohazard-1996-a02-yellow-panel-knob-door-leave`, swapped existing
front/back textures, a right hinge, and the same wood/knob rendering treatment.
It lasts 5.00 s: initial approach ends at 1.10 s, knob acts at 3.35–3.85 s,
micro-opening reaches 10 degrees at 4.05 s, acceleration starts at 4.25 s,
25 degrees is reached at 4.70 s, and fade runs at 4.80–5.00 s.
These are renderer calibration values, not measured original 3D angles.

The catalog still has one yellow-door card. Detail shows Enter/Leave, switches
actual preset IDs, and hides the generic Swing direction inspector for these
preset-backed traversals. Temporary edits reset on variant change.
Visual checks sampled both transitions, camera advance, viewed face, knob side,
and broad-face fade at a 640 by 400 rendering viewport. Exact source/model
proportions and the full issue #58 acceptance remain outstanding.
Screenshots: [Enter detail](images/yellow-door-enter-detail-2026-10-06.png),
[Leave detail](images/yellow-door-leave-detail-2026-10-06.png).

Verification: 60 core + 2 local asset tests, 15 package checks and 5 focused
browser cases pass. Full build and lint pass with the existing 3 React refresh
warnings. Review caught the Leave wood-rendering ID omission; both IDs are now
covered by the render-look regression test.

## 2026-10-06 Unified motion / era settings (current)

The user explicitly chose one configuration per animation motion and era,
including Enter/Leave. This supersedes the independent Iron Leave and Yellow
profiles above. The earlier entries and images document abandoned per-door fits.

All 1996 hinge-single presets now use the former Iron Enter's 4800 ms opening,
camera and fade tracks. A common optional handle track runs 2600–3100 ms,
before opening at 3120 ms; no-handle presets omit its marker and rotation.
The sound window is common too, 2600–4500 ms. Textures, hinge, swing sign and
handle model/presence remain preset properties. There are no per-ID timing
or camera overrides. The existing 1996 double-door profile is now selected
by motion/era and retains its previous behavior. 1998/1999 remain unchanged.

Core tests sample all four 1996 single-door presets every 40 ms to establish
identical opening angle, camera position/target and fade, and check common
markers, duration and sound window. ID changes must not affect selection.
Visual samples at closed, micro-opening and pre-fade states cover all four
presets: [shared style comparison](images/shared-single-1996-2026-10-06.jpg).
The opposite swing signs still yield different perspective and silhouette.
Original-video timing differences are intentionally no longer reproduced by
individual profiles; issue #58 stays open with this design decision recorded.
The current adjustment rules are in [1996 style](animation-style-1996.md).

Verification: 59 core + 2 asset checks and 15 package checks pass; build and
lint pass with only the original 3 React refresh warnings. Browser coverage:
33 passes in the broad run, then both remaining cases pass after updating
old sound-window and rounded seek-percentage expectations (35 cases verified).

## 2026-10-07 Explicit compatible animation sets (current)

Plan `superpowers/plans/2026-10-07-animation-sets.md` was independently reviewed
and approved before implementation. The user approved using exact reusable
sets selected by each preset, with motion/era compatibility. This supersedes
motion+era being the only profile selector. The 2026-10-06 unified profile
remains the micro-open set, but is no longer forced onto Iron Leave.

Reinspection of the original timed contact sheets supports two observed single
motion classes: Iron Enter and Yellow Enter/Leave retain a broad face through
late opening/fade, while Iron Leave narrows toward its edge. They now select
`1996-single-micro-open-advance` and `1996-single-wide-swing-advance` respectively.
The wide set reuses the earlier 4700 ms fit recorded above, not a reversed micro
curve. Blue double/1998/1999 migrate their unchanged profiles into separate sets.
The shared-set guarantee applies to exact tracks, times, easing and sound crop,
with optional handle presence only; no preset-specific calibration overrides.

Source evidence remains local-only in gallery frame-extracts:
`1996-a01-camera-2026-10-06/contact-sheet.jpg`,
`1996-a01-toward-2026-10-06/contact-sheet.jpg`,
`yellow-traversal-2026-10-06/contact-sheet.jpg`.
Those are samples of the exact MP4s listed in earlier sections. They establish
behavior classes, not exact identical source duration, angles or proportions.
Rendered samples of closed, micro-opening and late/fade states confirm the
broad-face versus narrow-edge distinction at the shared model's viewport.
[Rendered comparison](images/animation-sets-visual-2026-10-07.jpg).
[Detail set display](images/animation-set-detail-2026-10-07.png).
This is a behavior-class fit with acknowledged geometry and timing differences;
full five-door/direction acceptance under #58 remains open.

All seven released presets explicitly select compatible sets. Style-only callers
retain defaults; no-style/no-set legacy callers retain the old animation path.
Invalid explicit IDs, era, motion and style-less set choices fail without fallback.
Detail shows the resolved set; Enter/Leave switches the actual preset/set and
clears temporary edits. Normal/production editors remain hidden.

Verification: 65 core + 2 local asset tests, 16 package-boundary checks, and all
36 browser cases pass. Full build passes. Lint has only the existing 3 React
refresh warnings. Independent implementation review found no material issues.


## 2026-10-08 Micro-open fade follow-up

User playback feedback requested a later fade for
`1996-single-micro-open-advance`. Fade now starts at 4800 ms rather than
4600 ms and ends at 5000 ms rather than 4800 ms, retaining its 200 ms duration.
Iron Enter and Yellow Enter/Leave all receive this shared adjustment. Earlier
opening, handle and sound markers remain unchanged; the late door/camera tracks
continue to their existing end values over the extended approach. Other sets
retain their previous timing. This is a playback adjustment, not a new
source-video measurement.


## 2026-10-08 Continuous motion after micro-open pause (current)

Playback feedback clarifies that the brief micro-open pause should occur only
before the camera resumes advancing. The shared micro-open set now holds both
leaf and camera at 3300–3700 ms. From 3700 ms the leaf opens linearly from 10°
to 30° at 5000 ms, and the camera accelerates continuously from z6.02 to z3.95.
The former late leaf/camera deceleration is removed; 4300/4500 ms remain timeline
inspection markers rather than speed boundaries. Fade remains 4800–5000 ms;
handle and sound timing remain unchanged. Applies to Iron Enter and Yellow
Enter/Leave. This supersedes the earlier intermediate angle/camera fit values.


## 2026-10-09 Iron Leave middle swing continuity

User identified a mid-opening hitch in `biohazard-1996-a01-iron-door-leave`
(`1996-single-wide-swing-advance`). Its former 4250–4350 ms segment advanced
only 40° to42°, between much faster segments. Removed the intermediate angle
keyframes at4250,4350,4450 so the leaf moves continuously at87.5°/s from
30° at4150 to65° at4550. The original early motion, final72° at4700,
camera tracks, sound and fade4580–4700 remain unchanged. This is a targeted
playback correction; the micro-open set is unaffected by this change.


## 2026-10-09 Iron Leave vertical framing

User requested both top and bottom cropping during the approach, rather than
bottom-only cropping. The wide-swing set now targets the leaf center y0
throughout, replacing the prior upward target y0.2→0.4. Camera position and
approach speed, opening angles, sound and fade remain unchanged. Projection
checks at4150,4350,4550,4580 ms cover both vertical hinge-edge corners outside
the frame and balanced vertical cropping. Other animation sets are unaffected.


## 2026-10-09 Iron Leave stronger approach crop (current)

User playback feedback found the centered framing still insufficiently cropped.
The prior correction only changed aim; at4150 ms the stationary hinge edge was
just outside the frame. Wide-swing initial approach now reaches z4.5 at1350 ms
rather than z6.1, placing both hinge-edge corners at approximately ±1.155 NDC
before opening (about7.7% of frame height beyond each edge). Subsequent camera
z values are4.48@3350,4.46@3550,4.4@3650,4.25@3950,4.1@4150,4@4350,
3.93@4450,3.85@4550,3.8@4700. Centered target y0, leaf motion, sound and
fade remain unchanged. Stronger framing applies only to the wide-swing set.


## 2026-10-09 Iron Leave initial composition

User supplied an original-video screenshot showing the closed door already
nearly filling the image height on entry. Wide-swing camera starts at z5.8
rather than z9: the six-unit leaf projects to about89.6% of frame height,
with both edges initially visible. It then approaches z4.5 at1350 ms,
cropping both edges as documented above. Remaining tracks are unchanged.
This adjustment uses the supplied image for framing scale; exact source
silhouette/geometry and the reference's front/back hardware are not duplicated.


## 2026-10-09 Yellow Enter opening amplitude

Yellow Enter now selects the reusable `1996-single-micro-open-45-advance` set.
The requested visual fit reaches 45° at 4800 ms, before the existing 200 ms fade,
instead of the previous shared 30° endpoint. The 10° micro hold at 3300–3700 ms,
camera, handle, sound and duration remain unchanged. Iron Enter and Yellow Leave
retain the original 30° set. The 45° value is a visual calibration target, not an
angle measured uniquely from the source pixels.


## 2026-10-09 Yellow Enter close-passage follow-up

The source frame around 6.53 s shows a narrower front and a much more visible
side edge than the initial 45° fit. Yellow Enter now selects
`1996-single-micro-open-close-pass-advance`: the leaf reaches 64° and the existing
final camera Z 3.95 is reached at 4800 ms, before fade. The initial trial at Z
3.15 excessively enlarged the runtime handle, so the final camera distance is
retained. The existing 3 × 6 × 0.16 leaf and 60° camera produce an edge/front
projected-width ratio about 0.89 at aspect 1.6, close to the source ratio about
0.8. Total silhouette size and handle framing remain approximate; this is not a
full camera/geometry calibration. These are visual fitting values, not recovered
source geometry. The micro hold, target, handle and sound remain unchanged;
Iron and Yellow Leave keep their previous sets.


## 2026-10-09 Parking camera follow-up

The existing `1999-single-closed-wait-advance` set retains the 4800 ms duration,
closed wait until 3100 ms, full opening at 4050 ms and fade at 4600–4800 ms.
Only camera distance/approach is refitted: Z starts at 5.5 (previously 8), eases
out to 4.5 at 2300 ms (previously 6.6), holds until 3100 ms, then eases in along
one segment to Z 2.3 at 4800 ms. This removes the 4050–4300 ms jump from Z 5.7 to
1.5. The door begins near full height, both vertical edges crop during the wait,
and a leaf remains visible when fade starts. Existing angle, direction, surface,
sound and event contracts are unchanged. This corrects the framing and camera
speed; late face/edge silhouette remains a visual approximation of the source.

Visual checks: [closed wait](images/parking-closed-wait-2026-10-09.png),
[fade start](images/parking-fade-start-2026-10-09.png).

### 2026-10-09 — Traversal controls and portable calibration workflow

Removed the remaining Toward/Away preview buttons. The parking and 1998 no-handle presets explicitly declare Enter, so their workbench shows the authored Enter variant; Iron and Yellow retain their registered Enter/Leave pairs. No reverse variant is synthesized by flipping rotation. A browser regression checks both single-entry presets, Restore and Reset; existing traversal and parking playback tests remain covered.

The shared `calibrate-door-animation` skill links to gallery `docs/door-animation-reference.md`, which maps the tracked reference GIFs to full source IDs and passage segments. GIF observations are separated from fitted renderer angles/camera values, and audio/sub-frame limitations remain explicit. Local gallery validation is blocked by 96 extra ignored frame extracts (12,428 local versus 12,332 manifest entries); these files were preserved.

Verification: 73 core tests, 2 local-asset tests, 16 package tests and 5 focused browser tests passed. Lint passed with the three existing Fast Refresh warnings; library and browser sample builds succeeded. Skill validation passed. A temporary gallery checkout containing versioned assets/docs and no `materials/` passed `gallery:check` (113 doors/stills/GIFs; MP4/frame checks explicitly skipped), demonstrating the no-video handoff path.
