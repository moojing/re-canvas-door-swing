# CLAUDE.md

## Repository layout

This is an npm workspaces monorepo:

- `packages/door-lib/` publishes `retro-horror-door`. Its default public entry
  is a React-free, DOM + Three.js vanilla API: `mountDoorEntrance`.
- `packages/sample/` is a Vite + React development surface for the library.
  React belongs to the sample only, not to the library runtime graph.
- `docs/` contains current architecture and historical design records.

The sample home page (`/`) is the playable preset catalog. `/poc` retains
historic technical PoCs, and `/samples/vanilla.html` is the smallest plain
HTML integration example.

## Commands

Run from the repository root:

- `npm install`
- `npm run dev` - start the sample app at `http://127.0.0.1:5173`
- `npm run dev:lib` - rebuild the library in watch mode
- `npm run build` - build the library and sample
- `npm run lint` - typecheck the library and lint the sample
- `npm run test:lib:core` - framework-free animation, preset, sound, and
  controller tests
- `npm run test:lib:package` - public export and React-free output-boundary tests
- `npm run test:lib:browser` - Playwright coverage for the vanilla HTML mount
  and the preset catalog modal
- `npm run verify:lib:browser` - core verification followed by browser tests
- `npm run gallery:check` - validate the sibling evaluation gallery after
  changing evaluation data

## Library contract

- Consumers import from `retro-horror-door`:
  `mountDoorEntrance({ target, preset: "single-lever-wood" })`.
- A `preset` is the complete released combination of `type`, `motion`, handle,
  material, animation, camera behavior, sound, and surface textures. Do not
  create a separate public composition API.
- `random: true` chooses a complete registered preset. `type`, `motion`,
  `handle`, and `material` are filters for random selection only; do not combine
  them with an explicit `preset`.
- Presets can provide `frontTextureUrl`, `edgeTextureUrl`, and
  `backTextureUrl`. Missing edge/back values inherit the front surface.
  `textureUrl` is legacy compatibility for all three surfaces.
- Source videos, gallery thumbnails, and classification notes are development
  metadata. They must not enter the npm package.
- `retro-horror-door/vanilla` remains a compatibility alias. There is no React
  export or React peer dependency. A future React adapter must be a separate
  package built on the existing core/vanilla contract.

## Source structure

- `packages/door-lib/src/core/`: types, animation timelines, preset selection,
  and surface texture resolution.
- `packages/door-lib/src/vanilla.ts`: Three.js renderer, playback controller,
  audio scheduling, and mounted handle API.
- `packages/door-lib/src/assets/`: library-owned texture and sound assets copied
  into `dist/` by tsup.
- `packages/sample/src/pages/Index.tsx`: catalog grid.
- `packages/sample/src/pages/PresetAnimationPreview.tsx`: actual initial-frame
  renderer on each card.
- `packages/sample/src/pages/PresetDetailModal.tsx`: interactive vanilla
  renderer, controls, timeline, and usage snippet.

The renderer intentionally creates only the door leaves and handles. Do not
reintroduce a door frame, sill, floor, or separate fake card thumbnails.

## Change and verification expectations

- Extend `DoorAnimationConfig` first when adding motion, then register a
  complete preset in `src/core/presets.ts`; add assets only when project-owned
  or generated.
- Keep catalog previews and modal playback on the same `mountDoorEntrance`
  path. Audio must start only after a real user Play gesture.
- Run focused core/package/browser tests for library or catalog changes, then
  `npm run lint` and `npm run build` before a PR.
- Update `README.md`, `packages/sample/README.md`, and
  `packages/door-lib/docs/ARCHITECTURE.md` when public behavior changes.

## Evaluation gallery

`../re-door-gallery` is the single source of truth for classification records,
the report, and the estimation CSV. Edit those under
`../re-door-gallery/docs/`, then run `npm run gallery:check`. Videos and frame
extracts remain local-only in the gallery's ignored `materials/` directories
and must never be committed here.
