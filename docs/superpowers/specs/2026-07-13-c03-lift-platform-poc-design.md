# C03 Lift Platform POC Design

## Goal

Validate whether the `1-1 c03` lift-platform transition can be reproduced with
low-cost Three.js geometry when visual similarity is prioritized. The POC must
make the original human assessment (model creation cost too high) testable; it
must not present the prior AI estimate as confirmed before visual review.

## Scope

Add an isolated sample route at `/poc/c03`. The page will provide play, reset,
and timeline-scrubbing controls consistent with the existing A11 and B10 POCs.
It will render a black-background transition with the platform moving from a
distant overhead view into a close oblique view and back out.

The POC models these visible parts:

- rectangular platform frame and thickness;
- diamond-grid floor with alpha transparency;
- two raised floor plates;
- segmented perimeter railing, including the bent controller-side section;
- controller housing and three indicator/button faces.

The game environment, characters, production audio, and reusable library preset
are out of scope.

## Rendering Approach

Use a hybrid 3D construction. Primitive geometry establishes silhouette,
depth, parallax, and oblique-view behavior. Deterministic pixel generators
create the rust, transparent diamond grid, and plate textures at runtime. The
controller face and buttons use ordinary Three.js geometry and colors. No
source-video frame or external image is loaded by the POC.

The platform remains one static group. A dedicated camera rig interpolates
position and look target across a small set of measured keyframes. This avoids
adding platform-specific fields to the shared `DoorAnimationState` and keeps
the experiment independent from the public library API.

## Material Workflow

Keep the RGBA generators in `c03ProceduralMaterials.ts` so their output is pure,
testable, and independent of the browser. `LiftPlatformC03.tsx` converts those
pixels into `CanvasTexture` instances and disposes them when the scene unmounts.
Fixed seeds make the rendered texture reproducible between sessions.

The route must not load files from `public/textures/poc-c03`, the sibling gallery,
or any network location. This keeps the implementation self-contained and
prevents source-video pixels from entering the build output.

## Visual Validation

Run the sample and compare selected POC timeline positions against source-video
frames in the browser companion. The POC passes when:

- the platform is recognizable from its silhouette without relying on a single
  full-frame billboard;
- the floor grid remains legible without severe alpha artifacts at the target
  viewing angles;
- the railing, floor plates, and controller remain spatially coherent during
  the close pass;
- the far-to-close-to-far camera rhythm matches the source transition closely
  enough to judge production feasibility;
- no source video, extracted frame, screenshot-derived texture, or external
  texture request is present in the implementation or build.

## Verification

Run `npm run test:c03`, `npm run lint`, and `npm run build`. The focused test
checks deterministic material output, valid RGBA buffers, and real transparency
in the grid. Inspect `/poc/c03` at desktop and mobile widths and scrub the full
timeline to confirm that the generated materials remain legible.

## Decision Output

The POC does not automatically change the gallery verdict. After visual review,
record one of three outcomes: retain the original `cannot do` assessment, mark
the item as conditional pending production art, or replace it with a measured
implementation estimate based on the completed POC.
