# Animation detail device comparison

Approved by the user: compare desktop, tablet and phone on the same animation detail page.

- Keep the original single preview as the default and add an explicit “Compare devices” view.
- Comparison has three labeled viewports: Desktop 1440×900, Tablet 768×1024 and Phone 390×844. Mount at those logical dimensions and scale down to fit; preserve each camera aspect rather than stretching one rendered image.
- On wide screens arrange the three previews side by side; stack them on narrow screens without page overflow. Move settings below comparison to give previews the available width.
- Reuse `mountDoorEntrance`. The desktop handle is the only playback/audio clock. Its progress callback seeks the other two handles to the exact same progress. Followers never call Play and have sound disabled via the existing empty sound URL option.
- Play, Reset, stage seek, timing edits, Restore and traversal selection affect all mounted previews. Apply timing changes to followers before the master so duration conversion happens once per handle. Switching modes pauses and preserves current progress and overrides. Wait for all active handles to report `onReady` before enabling playback; this callback does not certify texture/model/audio completion, which is checked visually. Unmount every handle when leaving the view or preset.
- Retain the original full-screen preview, stopping all embedded playback first.
- No preset, calibration, source media, asset, package API or Phase 1 source-count changes.
- Verify real browser playback, shared progress, sound ownership, aspect ratios, stacking, mode switching, Reset, timing edits and Enter/Leave. Run existing browser regression, lint and builds.
