# B05 Neutral Fill Light Design

## Goal

Make the existing B05 arched gate slightly easier to see while preserving its current aged-iron material and the fully black environment that conceals the absence of side walls.

## Design

- Keep the generated aged-iron texture, material colors, roughness, and metalness unchanged.
- Keep the scene clear color and fog black.
- Keep the brown floor plane removed.
- Do not add orange outlines, rim-light bands, wall geometry, or image assets.
- Add one low-intensity neutral front fill light aimed at the gate face.
- The fill light should reveal a small amount of rust, pitting, and relief detail without materially brightening the gate frame relative to the leaves.

## Verification

- At the closed state, the gate and frame retain one consistent aged-iron style.
- The surrounding canvas remains visually black with no floor or side-wall boundary.
- The gate is only slightly brighter than the current version.
- The existing animation, procedural-material tests, lint, and production build remain unaffected.
