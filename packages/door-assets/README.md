# retro-horror-door-assets

Production media and local asset module for retro-horror-door. `index.js` exports media imports for bundlers; `index.d.ts` declares URL strings. This workspace owns the authored runtime files in textures/, models/ and sounds/.

The library uses this module as a development-only dependency through its door-local import condition. Published library builds use pinned jsDelivr URLs instead. For self hosting, copy the media directories to your host and pass assetBaseUrl to the library.

Model attribution and license information are included in models/ATTRIBUTION.md. build.mjs validates imports without copying or generating files.

The `./cdn` entry exports the same asset names as pinned CDN URL strings. `./base` exports DEFAULT_ASSET_BASE_URL without importing media. Library publication bundles these entries and their declarations; no runtime assets dependency is required. The build validates CDN paths and version against the local entry and package manifest.

## 1998 A03 S2 grid door texture

`textures/biohazard-1998-a03-grid-knob-door-front.webp` is an original generated
runtime albedo (ImageGen, 2026-10-11), based on observed three-panel aged-brown
wood construction. It contains no captured source pixels or baked hardware.
Front/back share the three-panel texture; the physical knob and lock plate are
renderer geometry. Fine grain, bevel shading and back detail are approximations.
The existing licensed round knob model is reused with a gray steel finish.
The new asset is local only until the assets package and library are released;
do not publish the library with the old pinned assets version.

## 1996 B07 S1 automatic sliding door

`textures/biohazard-1996-b07-automatic-door-leaf.webp` is an original ImageGen
albedo (2026-10-11), a gray worn steel leaf with a dark pentagonal pane and inner
trapezoid push plate. It contains no captured source pixels. The same authored
surface is used front/back; the right leaf is UV-mirrored to form the pair.
`textureFlipY: true` records its upright upload orientation; legacy assets retain
false. Edge faces use the metal surface texture; window/push-plate detail is
baked albedo rather than extra scene geometry. Fine appearance is approximate.
New files need an assets release and updated pinned version before library release.
