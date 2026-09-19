# GitHub Pages npm Beta Sample Design

## Goal

Deploy the sample to GitHub Pages using the published `retro-horror-door` beta and its jsDelivr-served assets, instead of the local library workspace.

## Design

The sample gains a non-interactive beta build script. It creates a temporary npm project, installs a requested `retro-horror-door` version, then runs the sample production build with `DOOR_PACKAGE_ENTRY` set to that installed package's `dist/index.js` and `VITE_DOOR_ASSET_MODE=cdn`.

The GitHub Pages workflow invokes the beta build with `0.2.0-beta.0`. The existing local `npm run dev` and `npm run build` flows remain unchanged: they keep resolving the library source and local assets workspace.

## Failure behavior

The beta build stops before producing a deployment if npm cannot install the requested version. Vite then fails the build if the installed package cannot be resolved. No fallback to a workspace package is permitted.

## Verification

- Test the beta build launcher with a temporary fixture that proves its environment selects the installed package and CDN mode.
- Run the production beta build locally after the published package is available.
- Inspect the output bundle for the published assets CDN prefix and verify it does not include local `packages/door-assets` media.
- Retain the current local browser tests for source/workspace development.
