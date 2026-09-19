# retro-horror-door-assets

Production media and local asset module for retro-horror-door. `index.js` exports media imports for bundlers; `index.d.ts` declares URL strings. This workspace owns the authored runtime files in textures/, models/ and sounds/.

The library uses this module as a development-only dependency through its door-local import condition. Published library builds use pinned jsDelivr URLs instead. For self hosting, copy the media directories to your host and pass assetBaseUrl to the library.

Model attribution and license information are included in models/ATTRIBUTION.md. build.mjs validates imports without copying or generating files.

The `./cdn` entry exports the same asset names as pinned CDN URL strings. `./base` exports DEFAULT_ASSET_BASE_URL without importing media. Library publication bundles these entries and their declarations; no runtime assets dependency is required. The build validates CDN paths and version against the local entry and package manifest.
