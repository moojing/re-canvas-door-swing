# Door Texture Asset Ownership

Date: 2026-05-23
Last updated: 2026-08-20
Status: **Implemented** (see Implementation Notes below)

## Summary

This debt is resolved. `retro-horror-door` owns its default texture and sound
assets in `packages/door-lib/src/assets/`, and tsup copies them into the
published `dist/` output with content hashes. Runtime presets import those
assets directly rather than relying on `packages/sample/public/`.

## Current State

- `packages/door-lib/src/core/presets.ts` imports the bundled `doorWood` asset
  and assigns it to `frontTextureUrl` for the current presets.
- `packages/door-lib/src/vanilla.ts` resolves front, edge, and back surfaces;
  omitted edge/back URLs inherit the front texture.
- `packages/door-lib/src/assets/{textures,sounds}/` contains the library-owned
  source assets. `packages/door-lib/package.json` publishes their generated
  copies through `dist/`.
- `packages/sample/public/` is not an implicit host for library defaults.

## Original Problem (historical)

- The library is not self-contained: a default asset is documented and assumed,
  but not actually owned by the library package.
- Consumers can get broken defaults unless they manually provide the expected
  `/textures/door-1.png` asset.
- The sample app is acting as an implicit asset host for library behavior.
- Asset replacement becomes confusing because the authoritative source is not in
  the package that declares the default.

## Original Risks (historical)

- Published package works differently from the sample app.
- Integrators may see missing textures in production.
- Future refactors in `sample` can accidentally break `door-lib` defaults.
- GitHub Pages or other non-root deployments can expose path assumptions more
  easily.

## Decision: Bundler Import

**Use bundler import (not CDN, not consumer-hosted paths).**

Rationale:
- Self-contained: no external service dependency (CDN downtime, network, firewall).
- Tree-shaking: consumer only bundles the textures they actually use — unused ones from the 100+ catalog are dropped at build time.
- Modern consumers (Vite, Webpack, Next.js) all support PNG imports natively.
- Pool size will be small (consumer picks 3–5 variants), so bundle impact is acceptable.

CDN (jsDelivr) was considered but rejected: the pool design means the set of
textures is fixed at build time, not runtime, so CDN's "load anything at
runtime" advantage does not apply here.

## Original Target Architecture (historical)

The sections below record the decision as it was proposed in May. The current
implementation is described in **Current State** and **Implementation Notes**;
the old `src/module/` paths are not part of the active codebase.

### 1. Library owns and imports its assets

Move image and sound files into the library source tree and import them as modules:

```
packages/door-lib/src/assets/
  textures/
    door-bars.png
    door-wood.png
    door-metal.png
    ... (100+ files)
  sounds/
    door-creak.mp3
    door-slide.mp3
    ...
```

Each texture exported as a named export:

```ts
// packages/door-lib/src/assets/textures/index.ts
export { default as doorBars } from './door-bars.png';
export { default as doorWood } from './door-wood.png';
// ...
```

At build time, Vite converts each import to a bundler-resolvable asset URL.
Consumer's bundler then handles inlining (small files) or separate chunk
(large files) via its own `assetsInlineLimit` setting.

### 2. Presets reference imported asset values, not string paths

```ts
// presets.ts (after)
import { doorWood } from '../assets/textures';
import { doorCreak } from '../assets/sounds';

const DEFAULT_DOOR_TEXTURE = doorWood;   // resolved URL or data URL
const DEFAULT_SINGLE_DOOR_SOUND = doorCreak;
```

`getTextureUrl(id, base)` in `textures.ts` is removed — the base-URL
indirection is no longer needed because paths are resolved at build time.

### 3. Consumer pool API

Consumer selects from the catalog; bundler tree-shakes the rest:

```ts
import { doorBars, doorMetal } from 'door-lib/textures';

useDoorEntrance({
  pool: [
    { variant: 'sliding-panel', textureUrl: doorBars },
    { variant: 'direct-entry',  textureUrl: doorMetal },
  ]
})
```

Library preloads only the pool entries at mount time. Random selection
picks from the pre-loaded pool only.

### 4. Consumer override still works

If a consumer wants to supply their own texture URL (remote URL, their own
public asset, or a data URL), the `textureUrl` prop continues to accept any
string — the bundler-import default is just the fallback.

## Original Files to Change (historical)

| File | Change |
|------|--------|
| `packages/door-lib/src/module/assets/textures.ts` | Remove `getTextureUrl` / `normalizeBase`; replace manifest string paths with imported asset values |
| `packages/door-lib/src/module/presets.ts` | Import asset values from `../assets/textures` and `../assets/sounds` instead of plain string defaults |
| `packages/door-lib/vite.config.ts` | Verify asset handling for lib build; confirm PNG imports resolve correctly |
| `packages/door-lib/package.json` | Add `exports` entry for `door-lib/textures` subpath if consumer direct-imports are needed |
| `packages/sample/public/textures/` | Remove `door-1.png` after migration (or keep for sample-only overrides) |
| `packages/door-lib/src/assets/` | Create directory; add texture and sound files |

## Implementation Notes (2026-07-11)

Implemented as decided, with the following deviations from the target
architecture above (which assumed a Vite library build):

- **tsup/esbuild `copy` loader instead of Vite asset handling.** The library
  builds with tsup, so `tsup.config.ts` maps `.png`/`.mp3`/`.glb` to esbuild's
  `copy` loader: each imported asset is copied into `dist/` with a content
  hash and the import statement is preserved in the output JS. The consumer's
  bundler resolves that import to a final URL (inline or file per its own
  config), which matches the "bundler import" decision.
- **Handle models included.** `handles/profiles.ts` had the same problem
  (`defaultModelUrl: "models/door_handle_single.glb"`), so the GLB moved into
  `src/assets/models/` and is imported the same way. The unused
  `door_handles.glb` is kept in source but deliberately not exported, so it is
  never copied into consumer builds.
- **`getTextureUrl(id)` kept, `base` parameter removed.** The manifest now
  stores resolved URLs (`TextureMeta.url` replaces `TextureMeta.file`), so the
  base-URL indirection (`normalizeBase`) is gone, but the lookup helper stays
  for API continuity.
- **Consumers must treat `.glb` as an asset.** Vite (as of v5) does not
  include `.glb` in its default asset types, so consumers need
  `assetsInclude: ["**/*.glb"]` (the sample app's `vite.config.ts` does this).
- Asset files now live in `packages/door-lib/src/assets/{textures,sounds,models}`
  with an `index.ts` per folder exporting named URLs (`doorWood`,
  `doorOpenClose`, `doorHandleSingle`). `packages/sample/public/` no longer
  hosts library defaults (`door-2.png` remains as a sample-only asset).

Verified manually per repo convention: library and sample production builds
pass, and the sample dev server loads texture/sound/model from the library
`dist/` with the door animation rendering correctly.

## Follow-up Work (out of scope for this change)

- Decide catalog size and naming convention before adding 100+ textures.
- Validate that tree-shaking actually drops unused texture imports in a Vite consumer build.
- Document an asset import subpath only if the public package intentionally
  exposes one; consumers currently select complete presets rather than building
  arbitrary runtime pools.
