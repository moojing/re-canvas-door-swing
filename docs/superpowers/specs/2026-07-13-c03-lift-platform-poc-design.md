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

The game environment, characters, production audio, reusable library preset,
and final distributable textures are out of scope.

## Rendering Approach

Use a hybrid 3D construction. Primitive geometry establishes silhouette,
depth, parallax, and oblique-view behavior. Crops from the source video provide
temporary rust, grid, plate, and controller textures for visual comparison.
The screenshot-derived textures are evidence-only placeholders and may not be
committed or included in a release build.

The platform remains one static group. A dedicated camera rig interpolates
position and look target across a small set of measured keyframes. This avoids
adding platform-specific fields to the shared `DoorAnimationState` and keeps
the experiment independent from the public library API.

## Asset Workflow

Add `scripts/poc/extract-c03-textures.sh`. It reads the source video from the
sibling gallery's ignored materials tree by default:

`../re-door-gallery/materials/door-transitions/1-1/c03/`

An environment variable may override the gallery root for worktree layouts.
The script writes crops to:

`packages/sample/public/textures/poc-c03/`

That output directory must be gitignored. The component must degrade to simple
rust-colored materials when the local crops are absent, so lint and production
builds do not depend on copyrighted source pixels.

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
- no source video, extracted frame, or screenshot-derived texture is tracked by
  Git.

## Verification

Run the extraction script, `npm run lint`, and `npm run build`. Confirm the local
texture output with `git check-ignore`, inspect `/poc/c03` at desktop and mobile
widths, scrub the full timeline, and verify that the route still renders with
the local texture directory removed or unavailable.

## Decision Output

The POC does not automatically change the gallery verdict. After visual review,
record one of three outcomes: retain the original `cannot do` assessment, mark
the item as conditional pending production art, or replace it with a measured
implementation estimate based on the completed POC.
