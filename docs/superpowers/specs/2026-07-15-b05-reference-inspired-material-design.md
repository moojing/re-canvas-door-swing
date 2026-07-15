# B05 Reference-Inspired Procedural Material Design

## Goal

Reproduce the approved static mockup's aged-iron mood on the B05 gate using original deterministic procedural maps, without shipping or sampling the reference image or generated preview.

## Visual Direction

- Use a dark wine-red and brown iron base.
- Add broad, irregular, low-saturation ochre oxidation islands.
- Add sparse muted gray-green patina, charcoal pits, and restrained worn scratches.
- Avoid bright orange outlines, uniform pixel noise, obvious tiling, and polished clean metal.
- Apply one consistent material family to the arch, bars, divider, lower panel, and relief blocks.

## Procedural Maps

- Preserve `createAgedIronPixels(width, height, seed)` as the color-map API.
- Add a deterministic roughness-map generator driven by the same sampled corrosion features and seed.
- Encode roughness as opaque grayscale RGBA pixels so it can be converted to a `CanvasTexture`; rust and pits are matte, while worn scratches are slightly smoother.
- Keep the color and roughness generators free of browser, Three.js, file, gallery, and network dependencies.
- Validate dimensions and allocation bounds consistently for both maps.

## Three.js Integration

- Create and dispose one color `CanvasTexture` and one roughness `CanvasTexture`.
- Use sRGB encoding only for the color texture; leave the roughness texture in linear/default encoding.
- Give both maps identical repeat wrapping and nearest filtering so their features remain aligned.
- Apply the same map pair and neutral material tint to every gate-leaf member.
- Keep existing geometry, inward-opening motion, neutral fill light, black environment, camera motion, fade, and controls unchanged.

## Gate-Only Scene

- Also apply the approved `2026-07-15-b05-gate-only-design.md` change.
- Remove visible side posts and the bottom threshold while preserving invisible hinge transforms and the leaves' own arched perimeters.

## Verification

- Pure tests prove both maps are deterministic, fully opaque, correctly sized, visibly varied, and responsive to seed changes.
- Roughness values include a meaningful matte-to-worn range without producing fully glossy metal.
- At progress `0`, the 3D scene contains only the paired gate leaves and shows the approved dark red-brown, ochre, and muted green aging.
- At progress around `0.5`, both leaves still open inward and the color/roughness features remain aligned.
- No bitmap reference, generated preview, gallery asset, side post, bottom threshold, floor, wall, or external request appears in the implementation.
- B05 tests, lint, production build, and `git diff --check` pass with no new errors.
