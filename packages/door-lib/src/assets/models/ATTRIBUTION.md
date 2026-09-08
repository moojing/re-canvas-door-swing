# Model Attribution

This directory contains third-party 3D model assets used by runtime presets.

## `door_knob.glb`

- Title: Door Knob
- Author: pipotgrz1885
- Source: https://sketchfab.com/3d-models/door-knob-07c38627c7f04016b4128f3ad130b80a
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License URL: https://creativecommons.org/licenses/by/4.0/
- Runtime use: imported as a GLB handle model for the Phase 1 A02 knob-door preset.
- Modifications in this repository: renamed file for project conventions and rendered at runtime with library material roughness/metalness normalization. On 2026-09-08, separated existing connected triangle components into a fixed rose/base and rotating grip/stem, preserving all 6,128 source triangles. Added an axial grip pivot with inverse child orientation so only the grip rotates around the shaft.
