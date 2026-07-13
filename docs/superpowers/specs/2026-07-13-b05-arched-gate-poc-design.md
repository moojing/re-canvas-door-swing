# 1-1 b05 Arched Gate POC Design

## Context

The current evaluation marks `1-1 b05` as `✅ 比評估樂觀` but still warns that
the result needs validation. The original CSV excluded it because no suitable model was
available. The source transition instead shows a regular double arched iron gate whose
main construction can be expressed with repeated low-poly geometry.

This POC tests whether the gate can be built without a purchased model, source-video
pixels, or external image assets. It is a feasibility experiment, not a production-ready
or frame-accurate recreation.

## Goals

- Build a recognizable double arched iron gate from Three.js primitives.
- Preserve real depth on the bars and frame while both leaves rotate inward.
- Demonstrate a closed-to-open-to-camera-pass transition against a black background.
- Generate an original aged-rust material procedurally with deterministic output.
- Keep the experiment isolated from the public `door-entrance` API.
- Leave the gallery evaluation as pending until the user reviews the rendered result.

## Non-goals

- Pixel-accurate reproduction of the game gate.
- Recreating the surrounding garden, wall, plants, or gameplay scene.
- Loading, cropping, or committing frames from the source video.
- Adding a reusable arched-gate preset to the library during the POC.
- Updating CSV hours or changing the gallery verdict automatically.

## Architecture

Add a sample-app route at `/poc/b05` and keep all POC-specific code under
`packages/sample/src/poc/`:

- `ArchedGateB05.tsx`: page layout, React Three Fiber scene, playback controls, gate
  assembly, camera rig, and fade plane.
- `b05Geometry.ts`: pure geometry calculations for the arch, bar heights, symmetry, and
  leaf-local placement.
- `b05Motion.ts`: pure timeline function for inward leaf rotation, camera motion, and
  fade opacity.
- `b05ProceduralMaterials.ts`: pure deterministic RGBA generation for aged iron.
- Focused Node tests beside each pure module.

`App.tsx` registers the route. No file under `packages/door-lib/` changes.

## Gate Geometry

The gate uses two mirrored leaves, each hinged at its outer edge. Every visible iron
member has physical thickness so oblique and opening views remain convincing.

- Straight vertical bars and the lower solid panel use `BoxGeometry`.
- The rounded top perimeter uses a segmented `TubeGeometry` or equivalent curved tube.
- Vertical bar heights are calculated from the arch equation, ending below the curved
  perimeter rather than clipping through it.
- A horizontal relief band separates the open bars from the solid lower panels.
- Small repeated relief blocks may suggest decoration, but they must not copy the source
  ornament pattern exactly.
- The left and right assemblies share one geometry description and mirror placement.

The POC intentionally changes proportions, spacing, and decorative details from the
reference while retaining the general category: aged double arched iron gate.

## Material Provenance

The implementation must not load any image from the gallery, source video, network, or
`public/` texture directory. `b05ProceduralMaterials.ts` generates complete RGBA buffers
from fixed coordinate noise and fixed seeds. The material combines:

- a dark oxidized iron base;
- nonuniform orange-brown rust patches;
- small pits and scratches;
- enough luminance contrast to remain readable against black.

`ArchedGateB05.tsx` converts the buffer into a `CanvasTexture`, uses nearest filtering for
the low-resolution look, and disposes the texture on unmount. The generated pattern must
be similar only in mood; its pixel distribution and decorative pattern must differ from
the source gate.

## Motion

`b05Motion.ts` accepts normalized linear progress and returns a complete render state:

- clamped progress;
- left and right inward rotation in radians;
- camera position and target;
- fade opacity.

The sequence is:

1. Hold briefly on the closed gate.
2. Rotate both leaves inward together to approximately 85 degrees.
3. Move the camera forward through the opening after sufficient clearance exists.
4. Fade to black at the end.

The motion is custom to the POC because the existing `double-swing` preset opens outward.
The pure function remains independent of React and Three.js scene objects.

## POC UI

Follow the existing A11, B10, and C03 POC pages:

- black full-page background;
- responsive centered canvas;
- short statement of the feasibility question and asset provenance;
- play and reset buttons;
- progress scrubber with percentage readout;
- optional close-view control only if it materially helps inspect bar thickness.

The page must state that all visual material is generated locally and that no source
pixels or external images are used.

## Testing

Use Node's built-in test runner and add a root `test:b05` npm script.

Geometry tests verify:

- left/right leaf data is symmetric;
- every vertical bar has positive height and terminates within the arch;
- placements remain inside each leaf's bounds.

Motion tests verify:

- progress clamps at both boundaries;
- leaves begin closed and end at the intended inward angle;
- camera coordinates and opacity remain finite and bounded across the timeline;
- forward camera motion begins only after the gate has opened enough for passage.

Material tests verify:

- output is deterministic for the same dimensions and seed;
- buffers contain complete RGBA data;
- visible luminance and contrast remain legible against black;
- the texture contains multiple rust and wear regions rather than a flat color.

Manual verification covers desktop and mobile widths, full playback, scrubbing, close
oblique views, and the absence of failed image/network requests.

## Success Criteria

The POC passes when:

- the closed silhouette clearly reads as a double arched iron gate;
- bar and frame thickness remain visible during inward rotation;
- the camera passes between open leaves without obvious clipping;
- the generated aged material is readable, deterministic, and independent of source
  imagery;
- focused tests, lint, and production build pass;
- gallery evaluation data remains unchanged pending user review.
