# Door Texture Asset Ownership

Date: 2026-05-23
Status: Open

## Summary

The `door-entrance` library currently defaults to a texture path of
`textures/door-1.png`, but the actual file is hosted by the sample app at
`packages/sample/public/textures/door-1.png`.

This means the library's default behavior depends on an external consumer app
shipping a specific static asset at a specific public URL.

## Current State

- Default texture path is defined in `packages/door-lib/src/module/presets.ts`.
- Texture manifest also points to `textures/door-1.png` in
  `packages/door-lib/src/module/assets/textures.ts`.
- The concrete asset currently lives in `packages/sample/public/textures/door-1.png`.
- `packages/door-lib/package.json` only publishes `dist`, so the texture is not
  packaged with the library itself.

## Why This Is Technical Debt

- The library is not self-contained: a default asset is documented and assumed,
  but not actually owned by the library package.
- Consumers can get broken defaults unless they manually provide the expected
  `/textures/door-1.png` asset.
- The sample app is acting as an implicit asset host for library behavior.
- Asset replacement becomes confusing because the authoritative source is not in
  the package that declares the default.

## Risks

- Published package works differently from the sample app.
- Integrators may see missing textures in production.
- Future refactors in `sample` can accidentally break `door-lib` defaults.
- GitHub Pages or other non-root deployments can expose path assumptions more
  easily.

## Recommended Direction

Choose one of these and standardize it:

1. Make `door-lib` own and publish its default texture assets.
2. Remove the implicit default texture and require consumers to pass
   `textureUrl`.
3. Keep a default only for the sample app, and document that the library itself
   does not ship built-in textures.

Preferred direction: make `door-lib` explicitly own the default asset, or stop
advertising a built-in default at all.

## Follow-up Work

- Decide asset ownership model for published builds.
- Update packaging/build so asset behavior matches runtime expectations.
- Align README usage examples with the final asset strategy.
- Replace the current sample-hosted texture only after ownership is clarified.
