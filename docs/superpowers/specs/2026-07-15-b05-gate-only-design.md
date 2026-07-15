# B05 Gate-Only Design

## Goal

Render only the two B05 iron gate leaves, without visible surrounding posts or a bottom threshold.

## Design

- Remove the visible `GateFrame` component and its render call.
- Remove both side posts and the bottom sill together; do not retain shortened or darkened variants.
- Keep the arched perimeter, vertical bars, divider, lower panel, and relief blocks because they belong to each gate leaf.
- Keep the invisible outer-hinge transform groups so the inward-opening motion remains unchanged.
- Keep the procedural aged-iron material, neutral fill light, black background, camera motion, fade, and controls unchanged.

## Verification

- At progress `0`, the 3D scene geometry contains only the paired gate leaves; the page header and animation controls remain visible.
- No vertical post or horizontal threshold appears beside or below the gate.
- At progress around `0.5`, both leaves still rotate inward around their original outer hinge positions.
- The aged-iron material, neutral fill light, black background, camera motion, fade, and animation controls remain visually and behaviorally unchanged.
- B05 tests, lint, production build, and `git diff --check` pass with no new errors.
