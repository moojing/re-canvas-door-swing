# 1996–1999 released preset timing calibration

## 2026-10-20 — Iron-window knob placement and review corrections

Both iron-window traversals now mount their front/back knobs at the same
physical leaf location, centered on the raised edge stile at 4% of leaf width
from its free edge (0.12 scene units for a 3-unit leaf). The prior generic
0.2-unit inset placed the base across the stile/panel seam. Enter uses the
left visible stile and Leave the right; other presets retain their existing
inset. This is a renderer/texture alignment fit, not a source measurement.
The added passage subtitles and hinge/push/pull subtitles below Enter/Leave
have been removed. Timing, swing directions, grip rotation and sound are unchanged.

Original S9 and iron-window MP4s are now available locally in the sibling
gallery materials directory. Fresh isolated source frames were compared to
the runtime staging; S9 remains screen-left, consistent with its tracked GIF.
Earlier unavailable-MP4 notes describe the prior review environment. Fine
motion, original texture detail and audio fidelity remain approximate.

Independent review found a stale package assertion requiring the old constant
inset expression. A separate fixer updated that assertion to cover the compact
window inset, signed placement and the existing shared front/back position.
The 16 package checks pass. Runtime screenshots in `docs/reviews/ticket-31/`
show the corrected positions and concise controls. Delivery/merge state is
tracked in [PR #74](https://github.com/moojing/re-canvas-door-swing/pull/74);
no new asset/library publication is included.

## 2026-10-17 — GIF re-review correction (current local fit)

This section supersedes the earlier same-day fits below. No merge/publication yet.
Source GIF order is first knob on screen-left, receding to screen-right; second
knob on screen-right, approaching the camera and passing to screen-left.
Enter now selects right hinge/away, Leave left hinge/toward. Latest user correction:
first grip counterclockwise180°, second clockwise180°. This supersedes earlier
same-day grip assignments; leaf direction, phase times and passage order are unchanged.

S9 remains a monotonic cubic approach, but ends at4640ms rather than5920ms:
the previous fit incorrectly included the source's trailing black interval.
Passage marker4000ms, fade4400–4640ms, fitted fixed leaf angle78° rather than72°.
Camera endpoints/target remain unchanged. The authored horizontal brass accessory
is scaled0.85; wood tint#b4aaa0 reduces brightness. S9 alone uses this set.

Iron first passage keeps4800ms and its existing micro/hold, but approach now
ends1920ms instead of1440ms. Second passage uses the separate reusable
`1999-single-knob-approach-outward-pass`:5280ms, approach1920, handle2240–2560,
micro2720, hold-end3040, full-open4160, fade4800–5280ms. This earlier swing follows
the second GIF passage's distinct sequence; era fallbacks are unchanged.
Both retain the shortened/top-aligned window, lower-corner handles, and scale
the entire imported/fallback accessory to0.7. Door faces/edges use tint#929892.
These are renderer fits; original generated surface details remain approximate.

Evidence: tracked288×216/6.25fps GIFs, sampled every0.32s, compared to fresh4:3
local preview captures at0–98%. S9 visible passage approximately3.52–8.0s;
iron passages approximately3.04–7.84s and10.56–15.84s. MP4 unavailable, original
audio unverified. Existing creak remains an approximation; S9 remains silent.

### Earlier same-day iterations (historical, superseded)

## 2026-10-17 — #31 local preview correction (not merged or published)

S9 `1996-single-open-running-pass` starts already open at a fitted72° with
right hinge and a level camera/target x3 throughout. This puts the visible face
and knob left of the view from the first frame, instead of an almost edge-on
leaf that only drifts left at the end. Duration5920ms and accelerating z path
are local fits. There is no evidenced knob action; its sound window is silent.

Iron-window Enter/Leave share `1999-single-knob-approach-wait-pass` (4800ms):
approach ends1440ms, handle2720–3040ms, micro-open reaches6° at3200ms,
leaf/camera/grip hold3200–3520ms, full opening4400ms, fade4560–4800ms.
Preset-owned grip handedness makes the right-hinged Enter clockwise and
left-hinged Leave counterclockwise from the front; back-face shaft signs reverse.
No other preset's turn direction or era default is changed. Two separate single
door traversals remain selectable, not a simultaneous double leaf.

Latest user-confirmed correction (supersedes the direction assignments above):
Enter is the first passage, left hinge/outward pull/clockwise knob. Leave is the
second passage, right hinge/inward push/counterclockwise knob. The user explicitly
confirmed that clockwise/counterclockwise describes the grip, not the leaf.
Distinct visible labels identify the two passages; controls show hinge and push/pull direction.
S9 uses the existing authored horizontal lever geometry with brass finish and
rectangular plate, not the imported round knob. The free-edge lever extends into
the leaf and mirrors on its rear. The imported knob remains on iron-window only.
The S9 lever/plate material is now yellow brass #e5c343 without the dark bronze
map, roughness0.78/metalness0.15; shared retro rendering is retained.

Latest pacing/layout adjustment: S9 now uses one cubic ease-in from z15.5
to0.45 over5920ms. The former2400ms easing restart dropped velocity to zero,
and the4800ms join reduced it again; both joins are removed. A20ms finite-step
regression verifies nondecreasing forward speed across the full path.
Following the user's further request for a faster ending, cubic replaces quadratic:
terminal speed increases50% (5.08 to7.63 scene units/s), while the first10% travels
only0.1% of the path. Duration, endpoints and fade are unchanged; the final2%
displacement regression requires at least48% improvement over quadratic.
Only S9 selects this set; era fallbacks and both iron-window tracks are unchanged.
Iron-window front/back UVs map the upper65% of the authored face into the top45%
of the leaf, retaining its top position and overall door dimensions. The window
bottom moves from58% to40.15% of door height, above the unchanged50.3% handle
center. Only the two iron-window presets use this layout; mirror and traversal
settings are unchanged. This is a user-directed layout fit, not a source measurement.

Reference: tracked gallery GIFs a02-009 (1-1) and a02-001 (1-3), plus the user's
explicit direction/staging review. Fine timing, angles and original audio remain
unverified without MP4. New hardware-free generated JPEGs are original surfaces;
symmetrical front/back share each material, edges map the same texture. Existing
CC BY knob model is reused. Assets and new presets are still local/unpublished.


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

## 2026-10-10 Blue double camera and source alignment

User requested a source comparison and then adjustment of the blue double door.
The existing `1996-double-micro-open-hold-advance` set now uses S3
`1-1/b02/b02-s3方塊門.mp4`, first passage, for motion as well as appearance.
Earlier S5 timing is historical. Gallery `docs/door-animation-reference.md`
records the source observations and portable tracked GIF; MP4/contact sheets
remain local-only. The first passage was sampled at1280×800/60fps, densely at
6.2–7.2 file seconds. Source timing is approximate, with local origin near1.87 s.

The former shallow approach (z8→6.9 over2.50 s), full90° opening and z6.2→1.4
sprint over0.15 s caused a black passage before fade. The refitted set lasts5.35 s:
initial approach z7.6→5.3 eases out over1.20 s, then holds until4.70 s. Camera
position and target both use y0.65, keeping the view level and shifting the door
downward: the lower edge crops while the upper hinge edge remains visible.
Opening starts4.32 s, reaches6° at4.50, holds to4.70, then accelerates along one
track toward40° at5.35. Only the left leaf opens away from the viewer; the right
angle track remains zero throughout. Camera accelerates
from z5.3 at4.70 to4.1 at5.15, then continues at its fade-start velocity to
approximately3.033 at5.35; no passage speed jump or second stop. Fade5.15–5.35
begins with both broad faces still visible. Late opening5.05 and passage5.10 are
inspection markers, not full-open or velocity boundaries. These are renderer
fits, not recovered original 3D coordinates.

Affected: the blue released preset and1996 hinge-double style-only fallback.
The double renderer now honors the existing `swingDirection` property; legacy
callers without a direction retain toward-viewer. Single profiles are unchanged.
The handle model/action, source sound crop and sound window2.75–4.70 remain
existing approximations; they have not been independently source-calibrated.
No reverse traversal is synthesized or claimed calibrated.

Local visual QA compared actual leaves and knobs at closed, approach, micro hold,
late opening, passage and fade, including complete playback and full-screen preview.
At1.6 aspect the late broad faces/cropped hinge tops approximate S3; source texture
color, hardware size and exact silhouette remain different.
[Fade-start preview](images/blue-double-fade-start-2026-10-10.png).

Verification:77 core tests and2 local asset tests,16 package checks, lint and full
library/sample build passed. Lint retains the existing3 Fast Refresh warnings.
An independent code review found no material issues. Gallery validation is still
blocked by the existing96 extra ignored extracts (12,428 local vs12,332 manifest);
those files were preserved. All3 focused browser checks passed: actual leaf pixel
visibility/direction at fade start, vanilla playback/reset, and blue catalog seek,
full-screen completion/reset/Back navigation.

### 2026-10-10 — Single active leaf correction

User identified that S3 opens only one side. Reinspection of6.2,6.8,7.0 file
seconds confirms left-leaf perspective rotation while the right front stays
flat. The previous symmetric opening fit confused the right leaf's camera-driven
growth with rotation. Right angle now stays zero for the entire set; left angle,
camera, fade and sound retain the preceding fit. The same correction applies to
the style-only fallback. Gallery source observations were corrected accordingly.
The earlier symmetric runtime screenshot is replaced with the corrected browser
capture. A focused regression samples the stationary right track every25 ms.
Verification after correction:78 core plus2 asset tests,16 package tests and2
double browser cases passed; lint passed with the existing3 warnings. Package
and browser runs rebuilt library/sample. Gallery validation retains the same
pre-existing96-extract count blocker.

## 2026-10-11 Blue opening sound alignment

User found that the opening sound led the revised motion. The double set had
retained its old2.75–4.70 s sound window while leaf opening moved to4.32 s.
It now plays the existing source crop over4.32–5.15 s, from opening-start to
fade-start. The closed wait is silent; playback rate fits the crop into that
window. This affects the blue preset and1996 double style-only fallback, without
changing motion, handle action or other sets. This is alignment of the existing
effect, not a reproduction of S3's original audio.

Verification:79 core tests plus2 asset checks and lint passed (existing3 warnings).
A focused browser test passed: after a Play gesture, sound stays paused during
the closed wait, starts when resuming at opening-start and pauses at fade-start.
The browser run rebuilt the sample; local detail playback was also exercised.

## 2026-10-11 — Replace yellow representative with selected 1998 A03 S2

The requested source is `1-2/a03/a03-s2目字門.mp4`, not1996 A02 S5.
Source observations and MP4 sampling are recorded in the sibling gallery's
`docs/door-animation-reference.md`. Added Grid Enter/Leave presets, left/right
hinges respectively, both toward-viewer. Both share the reusable
`1998-single-fixed-wait-micro-open-pass` set; no other era defaults change.
The historical yellow IDs remain explicitly mountable but are retired from
catalog/random selection. The original35 selection remains unchanged.

Renderer fit:4.80 s duration; fixed camera z5.5 and target y0 until2.90 s;
handle1.65–2.05 s; opening2.05–2.30 s to6°, hold until2.90 s, then90° at4.25 s;
camera accelerates to z1.5 by4.80 s; fade4.55–4.80 s. The existing licensed sound
crop plays only2.05–4.55 s after a Play gesture. These are fitted runtime values,
not recovered original angles, and this is not original-source audio.

Original generated brown three-panel albedo is shared front/back without baked
hardware; existing knob model has gray steel finish and a rectangular lock plate.
Fine material detail, handle rotation and reverse timing remain approximations.
Closed, micro hold, opening, passage and fade were inspected in the sample;
[fade-start runtime capture](images/grid-door-fade-start-2026-10-11.png).
Delivered by [PR #65](https://github.com/moojing/re-canvas-door-swing/pull/65);
merge state is authoritative there. Previously implementing yellow A02 S5 was
a source-selection mistake; it was outside the requested35-video list. New
assets need publication and an updated pinned asset version before library release.

Verification:81 core tests plus2 local asset checks,16 package checks,38 browser
checks plus1 added real-leaf fade visibility check for both Grid traversals pass.
Lint passes with0 errors and3 existing Fast Refresh warnings; library/sample
build passes. Independent review found no blocking issues. Historical yellow
sample detail URLs now fall back to a catalog preset; explicit library mount/get
IDs remain compatible. Gallery check retains the pre-existing frame manifest
mismatch (12,332 expected vs12,428 local ignored extracts); existing data preserved.
#31, #63, this repo progress table and Project In Progress were synchronized;
Category #31 remains open with two sources pending; publication remains pending.


## 2026-10-11：1996 B07 S1 中分自動滑门（本機完成／待合併）

Source observations are recorded in sibling gallery `docs/door-animation-reference.md`. The local MP4 has door segments approximately 1.333–6.299s and 10.366–15.333s: closed approach, wait, both leaves slide outward without hinge rotation, continued camera approach and fade. Small upper pentagonal windows and mirrored inner push plates inform the generated material; this is not an extracted source texture.

Renderer fit: `1996-double-slide-approach-hold-pass`, duration 5000ms. Approach ends at1500ms, sliding starts3350ms, advance resumes3600ms, sliding ends4350ms, fade4600–5000ms. Leaves translate x=0→±2.25 scene units; angles and handle rotation remain zero. Camera z=10→5.6, holds until3600ms, then reaches4 at4700ms; target remains origin. Sound window3350–4600ms crops the existing licensed effect at0.06–0.36; source audio is not reproduced. Enter/Leave currently share the observed path; fine directional timing and opposite-face detail remain approximate.

New translation fields participate in timeline sampling/retiming alongside camera/fade/sound. Texture upload orientation is explicit preset metadata, with mirrored right-leaf UVs. No accessory/frame/floor geometry is introduced.

Validation: 84 core +2 assets tests,16 package tests, lint and production build passed;41 full browser tests and2 final focused sliding tests passed (including upper-window orientation and symmetric gap/reset). Local source contact sheets and closed/open preview were compared; independent review found no blockers. Screenshots: `docs/images/automatic-sliding-closed-2026-10-11.png` and `automatic-sliding-fade-2026-10-11.png`. These checks establish local behavior, not exact source fidelity. Gallery check remains blocked by a preexisting frame inventory mismatch (manifest12332/destination12428); unrelated gallery data was preserved.

Assets/library are not published: release the new texture and update the CDN-pinned asset version before library publication. Original35 progress is5 merged +1 local, not6 merged.


### 2026-10-11：B07 滑門音效替換

User selected Kyodon's CC0 `automatic door.wav` (Freesound153423). Public HQ MP3 is stored unmodified in the assets workspace; original WAV requires login. B07 Enter/Leave select `automaticDoorSlide` through preset `soundUrl`. Source2.05–3.30s maps to timeline3350–4600ms at approximately1x playback, replacing the previous hinge effect crop without changing motion/camera/fade. This selection is an authored sound fit, not the source video's audio. Reset/seek and user-gesture unlock remain on the common sound runtime. Publication still requires updated assets/library releases.

Sound replacement verification:85 core +2 assets tests,16 package tests,2 focused browser tests, lint and production build passed. Browser confirmed Kyodon URL, approximately1x rate, paused during approach, playback after sliding begins and silence after Reset in both traversals. Existing lint warnings remain unchanged.


### 2026-10-11 — B07 sound tail after picture fade

User requested a short black hold with continuing sound followed by an audio
fade, to avoid the effect ending abruptly. The existing shared
`1996-double-slide-approach-hold-pass` set now ends at5650ms: picture fades
4600–5000ms as before, holds black with full-volume sound until5250ms, then
sound volume fades linearly to zero over400ms. Leaf/camera movement timings
remain unchanged; their final values hold through the black tail.

B07 Enter/Leave,1996 slide-double style-only callers and the legacy
center-split-slide config share the tail. A reusable optional sound-fade marker
participates in preview retiming; other profiles retain their previous volume.
Kyodon's unchanged3.940227s MP3 now uses source1.64s–end, mapped onto
3350–5650ms at approximately1x. The slightly earlier crop supplies enough
recorded tail for the extended window. This is the user's authored sound
arrangement, not an observation of the original video's audio.

Reset/replay restore full volume; timeline seeking samples the fade consistently.
Implementation remains local/pending merge and publication; source counts do
not change. Verification evidence is recorded in the Phase1 progress note.


B07 delivery is reviewed in [PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66); merge status is authoritative there.


### 2026-10-11 — B07 verified delivery merge

[PR #66](https://github.com/moojing/re-canvas-door-swing/pull/66) merged as
`2fd3959ab544d234740871825e6f3eec8a6aceb1`, after confirmation of reviewed head
`74ebad7680d0aa8e8328d2b73a8b9c2d06fefb13`. The implementation and sound-tail
fits above are now on main; preceding local/pending status notes are history.
88 core +2 local assets,16 package,41 browser tests and lint/build passed;
independent review found no actionable findings. Assets/library are not published.
#41 retains two elevator sources pending; detailed reverse/source-audio QA remains
approximate. See the synchronized Phase1 progress table for original35 counts.


### 2026-10-11：B07 閉門靠近構圖

User supplied a source screenshot showing approximately80% vertical occupancy at the held closed framing. Local original1280×800 frame at file3.5s has approximate bright bounds x233–1042/y107–755 (threshold35; bottom shading makes this approximate), or81.1% height. Previous renderer camera z5.6 projected the6-unit door at roughly96.6% viewport height. The shared1996 sliding set now holds z6.65 from1500–3600ms (approximately80.8% projected height), while initialz10, opening, passagez4 and image/audio tail timings remain unchanged. Both B07 traversals and the style fallback share this fit. This adjusts closed approach framing, not the later moving passage.

Verification:89 core +2 assets,16 package and2 focused browser tests passed; lint/build passed (existing warnings). Pixel bounds confirm78–83% closed door height in both traversals; window orientation, symmetric opening, sound-tail fade and Reset remain covered. Local preview screenshot: `docs/images/automatic-sliding-framing-2026-10-11.png`. Gallery check still reports the preexisting frame-count mismatch12332/12428; unrelated gallery files were preserved.

Framing calibration delivery: [PR #68](https://github.com/moojing/re-canvas-door-swing/pull/68); merge state is recorded on the PR. This adjustment does not change the6/35 source count or publication status.


## 2026-10-14 Parking initial framing correction

Source1-3/a01/a01-s2停車場門.mp4 at file1.4s has approximate bright door height77% (y135–750 of800 at threshold35); file1.9s80.8%,2.2s89.2%,2.5s99.1% cropped. Initial size remains stable through roughly1.7s, then approaches; closed waiting near3.6s crops vertically. Previous camera z5.5 made runtime start at97.8% height, confusing late close framing with the opening shot.

Shared1999-single-closed-wait-advance now starts z6.9, holds0–500ms, eases in/out to4.55 at1800ms, then slightly approaches4.5 at2300ms. Existing closed wait2300–3100ms, opening3100–4050ms, later passage toz2.3, target, sound, fade and4800ms duration are retained. Both explicit parking preset and1999 hinge-single style fallback use it; no reverse preset is invented. This fits size/approach, not exact source projection/vertical placement/material or full path.

Delivery includes library beta.4 and site version pin; assets beta.2 reused. Publication/live deployment must be verified after review before reporting remote correction delivered.

Verification:89 core +2 assets,16 package,12 beta-build and42 browser tests passed; lint passed with3 existing warnings. Pixel regression verifies75–80% initial/500ms hold,84–93% mid-approach, and vertically cropped2300/3100ms wait. Local initial/held screenshots are in docs/images/parking-initial-framing-2026-10-14.png and parking-held-framing-2026-10-14.png. Registry-installed beta.4 sample build passed; assets beta.2 unchanged. Delivery/merge status: [PR #71](https://github.com/moojing/re-canvas-door-swing/pull/71). Gallery check retains its preexisting12332/12428 frame count mismatch.


## 2026-10-20 Blue double late-approach correction (local / unpublished)

User reported a sudden final rush in `biohazard-1996-b02-blue-panel-double-door`. Rechecked original S3 first passage at file6.2–7.1s in100ms steps (1280×800/60fps source; local-only contact sheet under `/tmp/blue-door-late-review`). The existing gallery source record describes gradual enlargement with left-only opening and broad faces through fade, without a separate full-open sprint. MP4 file time is not runtime time; first passage starts approximately1.87s.

Previous renderer fit held camera z5.3 until4700ms, accelerated to4.1 at5150ms (5.33units/s), then reached3.033 by5350ms. Though velocity was continuous, the large displacement near the door exaggerated projected enlargement. New shared `1996-double-micro-open-hold-advance` fit holds together with the leaf through4500–4700ms, eases quadratically fromz5.3 at4700ms toz4.85 at5150ms, then continues at2units/s toz4.45 at5350ms. With the stationary right leaf, perspective scale grows about9% by fade start and19% by black, versus29%/75% previously. These are renderer projections, not source measurements.

The first softer candidate started the camera during the leaf hold. User visual feedback identified that this removed the perceived pause; the final fit keeps both completely still before advancing. Only this camera track changes. Initial framing, camera height/target, left-only leaf rotation, knob, audio mapping, fade and5350ms duration retain their prior values. The blue preset and1996 hinge-double style-only fallback share the set; no other released preset or Leave variant is added or changed. Precise source motion and original audio remain approximate.

Focused regression first failed on the old curve; revised core checks bound late projection growth/speed and verify continuity at fade. Real-render browser coverage measures the stationary right leaf at4500/5150ms and retains fade visibility, playback and controls. Local fade-start renderer capture: [blue double late approach](images/blue-double-late-approach-2026-10-20.png). Full playback was recorded locally and compared with the source contact sheet; the revised approach enlarges the leaves more gently. Verification results are recorded in the PR. This calibration is local, not merged or released; source counts remain8/35 published with27pending.

Verification:94 core＋2local-assets,16package,46browser tests pass; lint and library/sample build pass with existing warnings. Independent reviewer found no actionable issues. New real-render leaf-growth assertion passes; full playback, Reset, seek and full-screen remain covered.

2026-10-20 pause follow-up: core regression first failed against the moving-camera hold; final core94＋2asset/package16 pass. Browser checks now additionally require identical rendered width and scene checksum throughout4500–4700ms. Earlier46-browser run covered the first candidate; the final5 focused browser checks pass (blue pause/render growth/audio, timeline seek, full-screen and catalog playback). Lint and library/sample build pass with existing warnings; incremental independent review found no code blockers and its documentation feedback was addressed. The fade-start image was refreshed from the final run.


### 2026-10-20 — Blue forward duration and black-tail follow-up (supersedes prior same-day timing)

Source observations are added in sibling gallery `docs/door-animation-reference.md` ([Gallery PR #11](https://github.com/moojing/re-door-gallery/pull/11)): original MP4 right-leaf outline starts enlarging around file6.15s; image fades after roughly7.0s, is effectively black around7.2–7.3s, and game picture returns around8.4s. Threshold-based black detection at98% dark pixels gives7.146–8.412s, while visually full black is closer to7.25–8.4s. Use roughly1.1–1.2s as observed black duration, not exact original3D timing. The original late approach lasts roughly1s including motion during micro-opening; the previous runtime had only0.65s of post-pause movement and no black tail.

Final authored fit keeps the explicit4500–4700ms leaf/camera pause requested by the user, then spreads camera z5.3→4.45 quadratically over4700–5700ms. The image fades5500–5700ms; the camera reaches up to1.7units/s just before black. Leaf rotation reaches40° at5700ms. All scene tracks hold5700–6900ms with fadeOut1, and completion occurs only at6900ms. The new `black-start` marker is seekable and retimed with the shared profile. Other tracks end explicitly at6900ms for timeline validation.

Sound retains the existing licensed crop, with its playback window4320–5500ms aligned to the longer opening; it is not original-source audio and no sound is added to the black tail. Initial framing, knob action, left-only opening and200ms micro-pause remain. The new total6.90s is an authored pacing fit: retaining a full camera pause and giving a whole second after it is slightly longer than the source's approximately5.35s visible transition plus1.2s black. Do not describe those event timings as frame-identical. Blue and1996 hinge-double fallback remain the only affected users of the shared set.

Regression first failed without the black marker/hold; new checks require950–1050ms forward movement,1150–1250ms fully black hold, frozen geometry throughout the black tail, and no premature completion. Browser coverage additionally verifies the actual black overlay remains fully opaque at5700/6800ms while progress is below100%. Updated final validation is recorded in PR #77; earlier runs above apply to earlier candidates. Local/unpublished calibration;8/35 published and27pending stay unchanged.

Final tail verification:95core＋2local-assets,16package,46browser tests pass; lint and library/sample build pass with existing warnings. Independent incremental review found no blockers; its sound-test timing-margin note was addressed by checking silence at3200ms instead of a duration-dependent60% threshold. Gallery check passes113doors/stills/GIFs, with ignored video/frame directories absent in the isolated reference worktree.


### Final delivery review — 2026-10-20

[PR #77](https://github.com/moojing/re-canvas-door-swing/pull/77) delivers the final6.90s blue double calibration described above; [Gallery PR #11](https://github.com/moojing/re-door-gallery/pull/11) records the portable source observations separately. PR state is authoritative for merge status. Earlier same-day local/pending candidate notes are history. This delivery does not publish a new package: registry beta.5/live site retain the released curve until a separate version release. Source counts remain8/35 merged/published and27pending; #37 remains incomplete for its two other sources, and #58 retains fine source/directional/audio QA.


### Verified merge — 2026-10-20

PR #77 merged as `20ff5e3cade84f6304589e167355f80eb48e6b3e`, reviewed head `171473dcccf4622bd1f884faa4bdc728fb6c5b51`; Gallery PR #11 merged as `af4c8563bb10ed36b5a555189ce199d4b8350719`. Final independent review found no actionable findings. Fresh95core＋2assets,16package,46browser,lint and library/sample build passed with existing warnings. The6.9s curve is on main, not published; earlier local/pending notes describe prior states. Fine source and original-audio QA remain approximate.


## 2026-10-24 Closed framing across existing sets (local, unpublished)

User authorized implementation after the gallery's `docs/door-framing-reanalysis-2026-10-24.md`:874 source samples across14 passages exposed cropping/fade errors in the initial size-only conclusions. Stable closed width, upper edge, center and bottom crop are fitted independently. Original videos and source/runtime overlays remain ignored in `DOOR_GALLERY_ROOT/materials/framing-fit-2026-10-24/`; no source imagery enters this repo/package. Initial fade-hidden positions remain approximate.

Implementation was transplanted onto main `3d000c4` before final verification. The accepted Blue6.90s timeline remains: leaf/camera pause4500–4700, forward4700–5700, fade5500–5700, black5700–6900. Only its level camera height/target changes0.65→0.80. The newer S9 running and iron-window Enter/Leave sets, textures and registry entries remain intact. This task changes8 existing sets/11 affected presets, not every preset now on main.

Renderer fits (coordinates are internal fits, not recovered source parameters):

| Set / affected users | Closed framing fit | Connection to later motion |
| --- | --- | --- |
| 1996 micro-open advance: Iron Enter, retired Yellow Leave; close-pass variant: retired Yellow Enter | Level y0.85. Initialz7.1, approach samplesz6.32/5.75/5.46 at300/600/900ms, waitz5.23 at1200ms. The former small closed drift is removed. | Hold through3700ms, then ease to existingz3.95 endpoint/targety0.4; angle/handle/fade/sound unchanged. |
| 1996 wide-swing: Iron Leave | Level y0.85, initialz7.0, waitz5.23 at1350ms through3350ms. | Release framing correction across the existing late samples, rejoiningz3.8/y0/target0 at4700ms. Existing leaf timing retained. |
| 1998 no-handle / style fallback | Fixed position/targetx-0.28,y0.43; z5.31 through2850ms. | Viaz4.8 at3600ms, rejoin authored passage[0,0,1.4]/target0 at4000ms and finalz0.5 at4400ms. Regression protects passage, after review caught an earlier overcorrection there. |
| 1998 Grid Enter/Leave | Fixed position/targetx-0.27,y0.39; z5.28 through2900ms. | Ease to existingz1.5/target0 at4800ms. Keep fixed closed view and micro pause. |
| 1996 Blue / double fallback | Existingz path retained; levely0.80. | Preserve accepted6.90s late approach/black tail and all audio/leaf tracks. |
| 1996 Automatic Enter/Leave / slide fallback / legacy center-split config | Levely0.83, initialz10 retained; sample approach toz5.29 at1900ms instead of1500ms/z6.65. Hold through3600ms. | Existingz4 at4700ms, slide3350–4350ms, picture/audio tail and5650ms completion retained. |
| 1999 Parking Enter / style fallback | Initialposition[-0.23,0.675,6.24], level target. Existing500ms hold; approach to[0.25,0.70,3.93] at2300ms, target[0.25,0.325,0]. Oblique view matches tapered visible sides rather than uniformly scaling a centered rectangle. | Hold through3100ms; smoothly rejoin existing[0,0,2.3]/target0 at4800ms. Angle/audio/fade timings unchanged. |

Actual1280×800 browser closed widths after fitting: Iron Enter/Leave410px; Yellow Enter410/Leave406; no-handle405; Grid Enter/Leave407; Blue808; Automatic Enter/Leave814; Parking574. Relative to the reviewed stable source silhouettes, all11 affected views differ by less than2% in width, with upper-edge differences at most4px (Parking top is cropped). These bounds do not imply matching textures, hardware proportions or every later silhouette. Dark source lower portions are not used to infer full door height.

Visual QA: all11 affected presets inspected at initial, closed wait, true micro-hold, late opening, passage and fade; Blue also checked during its retained black tail. [Runtime closed before/after](images/framing-closed-2026-10-24.jpg) and [runtime phase sheet](images/framing-stages-2026-10-24.jpg) contain renderer images only. Source overlays remain local-only. No missing reverse traversal is synthesized. Reusable set/fallback users inherit the same tracks; released motion/audio contracts and counts remain unchanged.

Status: local calibration on `fix/framing-alignment`, not merged or published. Package versions/assets are unchanged. Final validation and independent review are recorded below after completion.


Final verification on main3d000c4 plus framing changes:112 core＋2 local-assets,16 package,47 browser tests passed. Browser coverage includes all11 affected closed pixel bounds/reset, real-leaf fade visibility, Blue pause/late-growth/black tail, newer S9/window controls, traversal switching, sound and full-screen/navigation. Lint/build passed with existing3 Fast Refresh warnings, outdated Browserslist data and sample chunk-size warning. Independent final review approved; its no-handle passage finding was fixed and regressed before the final runs. Evidence links and `git diff --check` verified; no material files tracked. Gallery validation remains blocked by the pre-existing96 extra ignored frames (manifest12332/destination12428), preserved unchanged. #30/#31/#37/#41/#58/#63 Source Doors/overview and Project statuses synchronized as local/unpublished, without resetting previously delivered implementations or inflating8/35 source counts. Worktree retained for local review; no release or merge performed.


## 2026-10-24 Blue stationary right handle follow-up (local, unpublished)

User observed that only the left leaf opens but both handles turned. The renderer previously applied the shared handle angle to every leaf. The reusable Blue double profile now supplies an optional `rightHandleAngle` track fixed at zero; the renderer applies it to both right-handle faces. Omitted tracks retain shared-handle behavior. Sampling, validation, timing edits and no-handle masking all preserve the independent track. Door angles, camera fit,6.90s duration, sound and fade are unchanged.

Regression evidence: the pre-fix browser comparison at2700ms/3350ms changed211 right-half pixels; after the fix the left handle visibly changes and the stationary right half has zero changed pixels, including after Reset. Core coverage samples the whole timeline and a retimed handle event. All113 core＋2local-assets,16package and48browser tests pass; lint/build pass with existing warnings. Independent review approved. All8 sample catalog cards also expose matching original GIF links; reference mapping remains outside the library. No source media added, no merge/publication, source counts unchanged.


PR #79 pre-merge verification found one intermittent Blue pause checksum mismatch (47/48 browser tests passed). Both sampled animation states were exactly identical; onReady only waits one animation frame and asynchronous asset callbacks can occur between separate browser evaluations. Pause and black-tail pairs are now captured synchronously in one evaluation while retaining exact equality assertions, preventing asset callbacks from interleaving. This changes test synchronization only; animation tracks are unchanged.
