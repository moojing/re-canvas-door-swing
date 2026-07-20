# C06 Drilled Hole PoC Design

## Goal

Create a reference-informed but original `1-3 c06` transition that proves the drilled-hole scene can be built with simple geometry and a camera push rather than a custom 3D model.

## Approved Direction

- Add a standalone `/poc/c06` sample and a card on the sample index.
- Build a stepped, asymmetrical opening from four wall sections and a ring of `BoxGeometry` brick blocks.
- Give the wall enough depth that the brick cross section remains visible while the camera passes through it.
- Animate only the camera: establish the opening, push through it, then fade to black. There are no moving props or character models.
- Generate one original square aged-brick albedo texture. It may share the source video's damp, low-light mood, but must use different brick placement, staining, and color variation.
- Do not copy frames, textures, characters, or room dressing from the source video into the deliverable.

## Geometry

The opening is roughly rectangular with stepped damage on all four sides. Large wall panels fill the outer frame. Individual brick boxes trace the inner perimeter at staggered depths, creating the right-angle exposed sections visible in the reference. A dim receiving wall and floor behind the opening prevent the hole from reading as empty transparency.

## Interaction

The animation autoplays once and exposes a replay button. Camera progress is deterministic and restartable. The page also displays concise notes explaining the primitive geometry and original-texture provenance.

## Verification

- Unit-test camera timing and jagged-edge layout data.
- Run sample lint and production build.
- Inspect the route at desktop and mobile sizes.
- Capture the opening before, during, and after the camera pass to verify front faces, exposed edges, and the receiving space.
