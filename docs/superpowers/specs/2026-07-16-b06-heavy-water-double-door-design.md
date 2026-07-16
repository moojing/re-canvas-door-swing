# B06 Heavy Water Double-Door POC Design

## Goal

Validate whether `1-2 b06` can reuse the proven A11 heavy-water-door construction while adding a true two-leaf hinge mechanism and a low-cost frozen material variant. The POC must demonstrate a deliverable-looking approximation on a black background without using original game pixels, external models, or network assets.

## Approved Visual Assets

The user approved two original generated front-elevation references:

- Normal source: `/Users/mujingtsai/.codex/generated_images/019f579c-3414-72c2-9eeb-f61e989b3d2e/exec-b4d93cef-314a-4291-8301-5ec55f5745be.png`
  - Dimensions: `1586 x 992`
  - SHA-256: `a6a9c27a179d836a98f5b21ac9c43e20300e1c43bced2ec9f092fd8ac0157f04`
- Frozen source: `/Users/mujingtsai/.codex/generated_images/019f579c-3414-72c2-9eeb-f61e989b3d2e/exec-eedf3746-100b-4e53-809d-c55bb3b0de27.png`
  - Dimensions: `1586 x 992`
  - SHA-256: `669cbc0e47df1adfdb3955fcc898f9ce322ea1651f88337d9f31dceeeeeeab3d`

Copy both verified files into `packages/sample/public/textures/b06/` as durable project assets. Reject a source whose dimensions or checksum differ. The implementation must not reference the Codex-generated-images directory, gallery repository, original game frames, data URLs, or external URLs at runtime.

## Hybrid Door Structure

- Build exactly two rectangular moving leaves with shallow BoxGeometry thickness. The leaves meet at the world center when closed and hinge at their outer edges.
- Split each approved front image into left and right door crops after removing only the near-black background around the complete door pair. Each crop becomes the front material for its matching moving leaf; it must remain attached to that leaf while opening.
- Preserve simple procedural side and rear faces so oblique views do not become flat image cards.
- Model the left circular valve wheel and right vertical pull handle as separate low-poly 3D parts. They remain children of their corresponding leaf.
- Do not add walls, floor, doorway surround, stationary side posts, threshold, duplicated full-door planes, or other environmental geometry.
- Both normal and frozen states share the exact same geometry. Only their front-face texture set changes.

## Animation And Camera

- Add route `/poc/b06` without changing the shared `door-entrance` library.
- Playback sequence: valve wheel unlocks first, both leaves then rotate inward around their outer hinges, the camera moves through the center opening, and the scene fades to black.
- Both leaves use equal but mirrored hinge angles. The center seam must separate cleanly without sliding or leaving a stationary front plane.
- Provide Play, Reset, and progress-scrubber controls consistent with the existing A11/B10/C03/B05 POCs.
- Provide a visible Normal/Frozen selector. Changing it must not reset progress or alter geometry, camera, lighting, or motion.

## Asset And Resource Handling

- Keep image metadata, crop bounds, and public paths in a small pure TypeScript descriptor module.
- Load each selected source once, derive two leaf textures, and publish the pair atomically. If loading or processing fails, retain a procedural dark-metal fallback instead of rendering a white model or crashing.
- Cancel late image callbacks after unmount or material changes. Dispose every created texture and material exactly once.
- Use sRGB for color textures, clamp wrapping, no atlas-edge bleeding, and front-facing transparent materials only where the removed black background requires alpha.

## Testing And Verification

- Pure motion tests verify valve-before-door timing, mirrored leaf angles, camera travel, and fade bounds.
- Pure asset tests verify exact source dimensions and checksums, deterministic crop descriptors, left/right ownership, runtime-local paths, and absence of gallery/game/external dependencies.
- Resource tests cover successful load, failed load, processing exception, state switch, unmount-before-load, atomic publication, and exactly-once disposal.
- Scene tests prove there are exactly two moving leaves, no surrounding geometry, front materials are children of the correct hinges, and both variants reuse identical geometry.
- Browser verification at progress `0`, mid-open, and near-complete compares the actual render with the approved generated references. It must show no duplicate full-door layer, no black image rectangle, no center overlap, and visible side depth while open.
- Run the B06 tests, existing POC tests, lint, production build, and `git diff --check` before completion.

## Evaluation Outcome

The POC is evidence, not an automatic classification change. If the generated fronts remain attached and convincing through the opening motion, classify B06 as feasible with A11 reuse plus a separately estimated double-door/material increment. If matching the approved static references still requires extensive UV reconstruction or geometry beyond this design, keep the item unresolved and record the observed cost.
