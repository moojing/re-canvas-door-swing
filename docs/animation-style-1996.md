# Era and animation sets

## Current agreement (2026-10-07)

A released preset explicitly selects an **animation set**. Same set means the
same numeric tracks, duration, phase times, camera position/target, door angles,
fade and sound crop/window. Era and motion specify compatibility, not a unique
path. Different sets may coexist for single doors in the same era.
This supersedes the 2026-10-06 rule that all 1996 single doors share one profile.
There are no per-preset timing or camera overrides.

A set includes optional handle action. Handle-less presets omit its marker and
zero the handle track; all other settings remain identical. Textures, material,
handle model/presence, hinge side and swing direction remain preset properties.
Those geometry differences can produce different screen silhouettes with the
same angle/camera curves. Enter/Leave names complete traversal presets, not
rotation signs or set names. Their preset IDs and catalog grouping stay stable.

## Current registry and assignment

| Set ID | Motion | Assigned released presets |
| --- | --- | --- |
| `1996-single-micro-open-advance` | hinge-single | Iron Enter, Yellow Leave |
| `1996-single-micro-open-close-pass-advance` | hinge-single | Yellow Enter; 64° opening; close approach completes at fade start |
| `1996-single-wide-swing-advance` | hinge-single | Iron Leave |
| `1996-double-micro-open-hold-advance` | hinge-double | Blue double door |
| `1998-single-micro-open-hold-advance` | hinge-single | 1998 no-handle door |
| `1999-single-closed-wait-advance` | hinge-single | 1999 parking door |

The micro-open advance set lasts 5.00 s: initial approach ends1.20, optional
handle action2.60–3.10, opening starts3.12, reaches10° at3.30, resumes3.70,
then opens continuously at constant speed to30° at5.00, fading4.80–5.00.
The leaf and camera pause together at3.30–3.70. After3.70 the camera accelerates
continuously toward its final position, with no late slowdown or second pause.

The wide-swing advance set lasts4.70 s: initial approach ends1.35, opening
starts3.35, reaches3° at3.55 and6° at3.65, accelerates toward30° at4.15,
then opens continuously at constant speed to65° at4.55, and fades4.58–4.70 ending72°. Its later swing
narrows Iron Leave's viewed silhouette toward the edge. Its camera looks at
the leaf center (target y0). Initial framing starts at z5.8 (about90% door height).
Initial approach reaches z4.5 at1.35 s,
visibly cropping both top and bottom before opening, then advances to z3.8. These angles and camera
values are renderer fits, not recovered original 3D coordinates.

Blue/1998 retain the preceding numeric profiles. Parking camera framing and
late acceleration were refitted on 2026-10-09; see the latest calibration section.

## Implementation and compatibility

`core/animationSets.ts` owns set metadata, assignments to reusable profiles,
compatibility and style-only defaults. `core/animationStyles.ts` owns the tracks.
`getDoorEntranceAnimationSet(preset)` exposes frozen primitive-only metadata,
not a public way to mix an arbitrary set into mount options.
`mountDoorEntrance({ target, preset })` and random filters remain unchanged.

Unknown explicit IDs, motion mismatch, era mismatch and an explicit set without
style throw; they never silently fall back. Older style-only presets retain
motion/era defaults (1996 hinge-single defaults to micro-open advance).
Presets with neither style nor set retain the legacy animation path.

Detail displays both era and the resolved set ID. Traversal switching changes
the actual preset and set when appropriate, and clears temporary preview edits.
Calibration mode can temporarily retime the selected set's markers; accepted
changes belong in its shared library profile. Normal/production editors stay hidden.

## Future changes and verification

Use [calibrate-door-animation](../.codex/skills/calibrate-door-animation/SKILL.md).
Gallery `docs/door-animation-reference.md` maps portable tracked GIFs to source
passages and records observations separately from runtime fitting parameters.

First classify the reference motion and camera path, then reuse a compatible
set if it matches. A different material, knob presence or small source-timing
difference alone does not require a new set. A materially different trajectory
can justify a new reusable name and exact configuration. The set name must
represent behavior, not duplicate a video or preset ID.

When adjusting a set, enumerate every assigned preset, compare complete tracks
including easing and source sound crop, run relevant core/package/browser checks,
lint/build, and visually check the affected directions. A set used by only one
preset is allowed when the path is distinct; do not generalize compatibility
without a matching animation structure.

The source comparison uses original local gallery videos and ignored timed
contact sheets. Iron first transition and both Yellow transitions retain a broad
face before fading; Iron second transition narrows late. This supports the above
behavior grouping. Exact source seconds, proportions and individual fits are not
claimed identical. Original files remain in sibling gallery materials, outside
library assets. Details and historical decisions are in
[the calibration record](era-animation-calibration-2026-10-05.md).
Full five-door visual/direction QA under issue #58 remains open.
