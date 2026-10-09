# Era Animation Style Design

Issue [#58](https://github.com/moojing/re-canvas-door-swing/issues/58) is the product specification. This document records its implementation boundaries against main after PR #59.

## Purpose and scope

The five released 1996–1999 presets currently use shared mechanical animation IDs and therefore share much of their timing. Each preset should retain its released geometry, surfaces, and handle but play a reference-informed sequence of closed approach, handle action, slight opening if present, possible pause, continued opening, passage, and fade. The 2000 works, running variants, and automatic/sliding doors remain outside this change.

The exact MP4 is evidence for timing; 0.1 s contact sheets locate brief changes. Source footage, screenshots, reference URLs, and classification records stay in the sibling gallery. Core profiles contain only numeric runtime values. Camera distance and rotation angles are fitting parameters, not claimed engine measurements.

## Model

`motion` remains the mechanical class. `animation` IDs and route links remain for compatibility. New optional preset-owned `animationStyle` values identify the 1996, 1998, and 1999 timing families; missing style uses current playback. A style supplies default tracks and a released preset may replace entire tracks when its source differs. The public mount API does not allow users to mix style, material, handle, and motion arbitrarily.

One absolute timeline in milliseconds has validated keyframes for door leaf angle, optional right leaf, handle angle, camera position and target, and fade. Repeated nonzero door-angle values represent a slight-open hold. Named events become seek markers and define the sound window. Local segment easing cannot shift another track's event boundaries. A pure sampler makes Play, seek, and Reset deterministic. One resolver supplies the config to controller, vanilla playback, and sample UI.

The current `swingDirection` field and preview toggle from PR #59 remain unchanged. Direction is viewer-relative and independent of `hingeSide` and `animationStyle`. The detail page gains only preview-local timing calibration controls. Changing them redraws the selected preset without altering its authored registry values; restoring values resets all preview overrides. Published settings remain the only values used by `mountDoorEntrance({target,preset})` outside the development preview.

## Expected reference differences

- 1996: initial closed-door approach, slight opening, short hold/slow interval, renewed opening, comparatively early fade.
- 1998: more stable composition while closed, slight opening, clearer hold/slow interval, renewed opening and a longer visible passage.
- 1999 ordinary parking door: closed approach and hold, then continuous opening and passage. No long post-open hold is imposed from the current sample.

These are starting family defaults, not rules inferred for every door in a year. The five exact sources are calibrated separately. Per-preset differences take priority over family defaults.

## Behavior and validation

The renderer and sample must use the same resolved duration and markers; sound starts only after a Play user gesture and stays synchronized after seek or resume. Invalid profile times fail explicitly. Existing legacy configurations remain stable. Tests cover profile boundaries, sound window mapping, preset switches, route behavior, preview controls, and browser playback. Visual checks compare each source and preset at closed, first open, hold, full open, passage, and fade. A check on issue #58 is marked complete only when the full criterion is verified.
