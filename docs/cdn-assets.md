# Runtime assets and beta testing

The main package contains code and versioned URLs, without media files or an assets runtime dependency. The independent `retro-horror-door-assets` workspace owns the production textures, models and sounds, and exports local media imports through `index.js`. Its build validates referenced files.

## Local sample

Run `npm install` then `npm run dev`. The library imports the assets workspace through its internal `#door-assets` conditional entry. Sample Vite enables `door-local`; no files are copied into sample/public. Edit production media in `packages/door-assets/`. Vite handles URLs during development and emits media during the sample build. See [system design](design/asset-loading.md).

## Self hosting

Copy the assets package's `textures`, `models` and `sounds` directories under your chosen public directory, then use:

```ts
mountDoorEntrance({
  target: document.getElementById("door-root"),
  preset: "biohazard-1996-a01-iron-door",
  assetBaseUrl: "/door-assets",
});
```

The option changes only library-owned URLs. Explicit `textureUrl`, `handleModelUrl` and `soundUrl` overrides retain their original values. Cross-origin hosting must serve appropriate CORS headers. The CDN default needs network access.

## Publish a beta

Prepared versions: library `0.2.0-beta.0`, assets `0.1.0-beta.0`. They have not been published by this change. Confirm npm name ownership and sign in before publishing. Keep the pinned base URL in `packages/door-assets/base.js` aligned with the asset manifest version. Never replace media under an already released version.

From the repository root:

```sh
npm run lint
npm run test:lib:core
npm run test:lib:package
npm run test:lib:browser
npm run build
npm pack --workspace retro-horror-door-assets --dry-run
npm pack --workspace retro-horror-door --dry-run
npm publish --workspace retro-horror-door-assets --tag beta --access public
```

Verify the pinned jsDelivr asset URLs return the correct media and CORS headers before publishing the library:

```sh
npm publish --workspace retro-horror-door --tag beta --access public
npm run dev:beta --workspace retro-horror-door-sample -- 0.2.0-beta.0
```

The beta sample launcher installs the requested registry version into an isolated temporary directory, bypasses the workspace source alias, and uses CDN assets. Stop the existing local sample first or use the new port Vite prints. Catalog previews, modal playback and full-screen transitions use the installed package. The handle-material development verifier remains a local authoring tool.

The built library uses CDN URLs; use the source workspace with `door-local` for unpublished local media. To build a deployed sample against a separately installed beta, set the same variable to that install's entry and `VITE_DOOR_ASSET_MODE=cdn` when running the sample build. Do not set CDN mode before the assets release is available.

The beta command installs into an OS temporary directory and leaves it for inspection. No registry installation changes the repository dependencies or lockfile.
