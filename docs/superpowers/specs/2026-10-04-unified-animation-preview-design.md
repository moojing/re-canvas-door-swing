# Unified Animation Preview Design

## Goal

Use one animation detail page for interactive preset preview. Let a user adjust single-door swing direction and maximum opening angle immediately, without changing the released preset registry.

## Navigation

- The catalog's **Open preset** action navigates to `/dev/animations/:animationId?preset=:presetId` instead of opening `PresetDetailModal`.
- The Animations list continues to link to the same detail route. Its first published preset is selected by default; the query parameter selects a specific preset.
- Unknown animation IDs show the existing Not Found page. A missing, unknown, or mismatched preset ID selects the first published preset for the route's animation; the page never displays a preset from another animation.
- The detail page has a visible **Back** link. Navigation from the catalog returns to `/`; navigation from the Animations list returns to `/dev/animations`. Direct visits fall back to `/dev/animations`. Changing presets in the detail page preserves that return destination.
- The separate full-screen transition remains a catalog demonstration, not another editable preview.
- Remove the unused modal after its functionality has moved to the detail page.

## Detail page

- Show the selected preset's name and fixed metadata: animation, motion, hinge side, material, handle, authored swing direction, and authored maximum angle (90 degrees).
- Keep Play, Reset, and timeline seek. Reset returns the playback position to zero; a separate **Restore preset values** action resets the preview controls.
- For single-hinge presets, offer Storybook-like controls for `swingDirection` (`toward-viewer` or `away-from-viewer`) and maximum opening angle (15–120 degrees, default 90). Hide these controls for double doors until their motion is separately designed. Clamp values from the preview API to this range.
- A control change redraws the current animation frame immediately without resetting the progress, rebuilding textures, or writing to the preset registry. The current control values remain in page state while this preset stays selected; changing presets initializes controls from the new preset.
- Preview adjustments are local to the detail page. Reloading returns to released preset values. The code example remains the released `mountDoorEntrance({ preset })` call and is labeled as such.

## Library boundary

- Keep `DoorEntrancePreset` as a released full combination. The existing optional `swingDirection` describes the authored direction; missing values retain the current `toward-viewer` behavior.
- Add a narrow preview override object to the mounted vanilla handle, with `swingDirection` and `maxOpenAngleDeg`. Applying it replaces previous overrides and redraws at the current progress. `{}` restores the preset values. This does not expose arbitrary motion, handle, or material mixing.
- The default opening angle remains 90 degrees. Validate the preview angle so invalid or out-of-range values cannot create an uncontrolled transform.
- Existing Play, Reset, sound-after-gesture, and full-screen transition behavior remain unchanged.

## Verification

- Core/package tests cover the authored A-1 swing directions and the preview override API boundary. Browser tests cover both entry routes, Back behavior, preset selection, live controls at a held timeline position, Restore preset values, and the existing full-screen transition.
- Visually inspect closed, half-open, and fully open states for both A-1 variants in the local sample, comparing against their local reference videos. Run lint, build, core, package, and browser checks.
