# Repository Guidelines

## Project Structure

The repository is an npm workspaces monorepo:

- `packages/door-lib/` is the publishable `retro-horror-door` library. Its
  default API is vanilla JS + Three.js; it must remain React-free.
- `packages/sample/` is a Vite + React app used to develop and visually verify
  the library. The catalog lives in `src/pages/Index.tsx`, with the renderer
  preview and modal in adjacent page modules. The old PoC routes have been
  retired now that direct-entry presets render through the library.
- `packages/door-lib/src/core/` contains framework-free types, timeline state,
  preset selection, and texture resolution. `src/vanilla.ts` owns DOM mounting,
  the renderer, playback, and sound.
- Library-owned assets live in `packages/door-lib/src/assets/`; sample `public/`
  assets are only for the sample.

## Commands

Run commands from the repository root:

- `npm install`
- `npm run dev` - start the sample app
- `npm run build` - build library then sample
- `npm run lint` - library typecheck and sample lint
- `npm run test:lib:core` - core behavior tests
- `npm run test:lib:package` - published entry and React-free boundary tests
- `npm run test:lib:browser` - Playwright coverage for the vanilla sample and
  catalog modal
- `npm run verify:lib:browser` - core verification plus browser coverage

## Library Conventions

- Public usage is `mountDoorEntrance({ target, preset })` from
  `retro-horror-door`.
- A preset is a released, internally valid full door combination. Do not add a
  public API that arbitrarily mixes motion, handle, and material.
- Random mode chooses from registered presets and may use `type`, `motion`,
  `handle`, and `material` only as filters. Explicit `preset` and filter fields
  are mutually exclusive.
- Surface assets belong to the preset: `frontTextureUrl`, `edgeTextureUrl`, and
  `backTextureUrl`. `textureUrl` remains a legacy all-surfaces alias.
- Do not add source videos, frame grabs, gallery thumbnails, or reference
  metadata to the package.
- The vanilla scene contains only door leaves and handles. Do not reintroduce a
  frame, floor, sill, or unrelated scene geometry.

## Catalog Conventions

- The sample home page lists `doorEntrancePresets`; do not duplicate registry
  data in the sample.
- Card previews must render the actual preset at its initial state through
  `mountDoorEntrance`. Detail playback opens in a modal, not a lower-page
  section or a separate fake preview.
- Keep Play, Reset, timeline seek, Escape close, overlay close, and mobile
  close-button behavior working. Sound begins after the Play user gesture.

## Testing and Pull Requests

Use TypeScript with two-space indentation. Prefer focused tests in the same
area as the behavior being changed. Library or catalog changes require the
relevant core, package, or browser test, plus `npm run lint`; visual renderer
changes should also be checked in the local sample app.

Follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`). Pull requests
need a concise summary, test evidence, and a screenshot or clip for UI changes.

## Evaluation Gallery

The sibling `../re-door-gallery` repository is the single source of truth for
door classification records, the report, and the estimation CSV. Do not copy
those files here. Edit the gallery's `docs/` files and run
`npm run gallery:check` after any evaluation-data change. Gallery source videos
and frame extracts are local-only under ignored `materials/` directories.
