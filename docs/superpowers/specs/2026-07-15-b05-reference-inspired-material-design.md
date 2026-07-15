# B05 Reference-Inspired Procedural Material Design

## Goal

Reproduce the approved static mockup's aged-iron mood on the B05 gate using original deterministic procedural maps. Do not ship, sample, trace, preprocess, encode, or otherwise derive pixels, masks, coordinates, noise fields, constants, or palettes from the source image or generated preview; use only independently authored procedural code and generic human-selected color-direction parameters.

## Visual Direction

- Use a dark wine-red and brown iron base.
- Add broad, irregular, low-saturation ochre oxidation islands.
- Add sparse muted gray-green patina, charcoal pits, and restrained worn scratches.
- Avoid bright orange outlines, uniform pixel noise, obvious tiling, and polished clean metal.
- Apply one consistent material family to the arch, bars, divider, lower panel, and relief blocks.

## Procedural Maps

- Add `createAgedIronMaterialPixels(width, height, seed)` returning paired `colorPixels` and `roughnessPixels` buffers.
- Preserve `createAgedIronPixels(width, height, seed)` as a compatibility wrapper returning the paired generator's color buffer.
- In one pixel loop, calculate a shared corrosion-feature record containing coarse oxidation, patina, grain, pit, and scratch values, then derive both output pixels from that same record. Do not implement two independent noise pipelines that merely share a seed.
- Encode roughness as opaque grayscale RGBA pixels so it can be converted to a `CanvasTexture`; rust and pits are matte, while worn scratches are slightly smoother.
- Keep the color and roughness generators free of browser, Three.js, file, gallery, and network dependencies.
- Use one validator for the paired API and compatibility wrapper. Width and height must be positive safe integers, total pixels must be between `2` and `16_777_216` inclusive, and seed must be a safe integer. Reject every invalid case with `RangeError` before allocating either buffer.

## Three.js Integration

- Create one color `CanvasTexture`, one roughness `CanvasTexture`, and one `MeshStandardMaterial` per mounted gate instance. Share those exact objects across every member of both leaves and dispose each object exactly once from the gate owner's unmount cleanup.
- The installed Three.js `0.133.1` API uses `colorTexture.encoding = THREE.sRGBEncoding`; set `roughnessTexture.encoding = THREE.LinearEncoding` so roughness data receives no sRGB conversion.
- Give both maps identical repeat wrapping and nearest filtering so their features remain aligned.
- Configure the shared material with white `0xffffff` tint, identical metalness/roughness parameters, and the same map objects across arch, bars, divider, panel, and relief blocks so the color map is not differently multiplied per member.
- Keep existing geometry, inward-opening motion, neutral fill light, black environment, camera motion, fade, and controls unchanged.

## Gate-Only Scene

- Also apply the approved `2026-07-15-b05-gate-only-design.md` change.
- Remove visible side posts and the bottom threshold while preserving invisible hinge transforms and the leaves' own arched perimeters.

## Verification

- Pure tests prove both maps are deterministic, fully opaque, correctly sized, visibly varied, and responsive to seed changes.
- An alignment test identifies generated pit and worn-scratch color classes and verifies their paired roughness values follow the same semantic feature record: pits are matte and scratches are measurably smoother.
- Boundary tests cover minimum and maximum accepted pixel counts plus invalid non-integer, unsafe, zero, negative, one-pixel, oversized, and invalid-seed inputs, confirming both buffers are rejected before allocation.
- Roughness values include a meaningful matte-to-worn range without producing fully glossy metal.
- At progress `0`, the 3D scene contains only the paired gate leaves and shows the approved dark red-brown, ochre, and muted green aging.
- At progress around `0.5`, both leaves still open inward and the color/roughness features remain aligned.
- A source/static-asset check confirms no bitmap reference, generated preview, tracing/preprocessing artifact, encoded image, pixel-derived data, gallery asset, side post, bottom threshold, floor, wall, or external request appears in the implementation.
- B05 tests, lint, production build, and `git diff --check` pass with no new errors.
