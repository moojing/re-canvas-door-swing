# A04 and C06 POC Gallery Design

## Goal

Add the existing A04 door POC and the current C06 drilled-hole POC to the main `/poc` gallery without importing the legacy `PocIndex` or `PocList` pages.

## Scope

- Preserve the existing A04 detail route at `/poc/a04` and add a static gallery card with a local thumbnail.
- Bring the latest committed C06 scene, camera model, two original brick textures, and local thumbnail to `main`; register `/poc/c06`.
- Expand the data-driven gallery from five to seven cards.
- Keep every gallery thumbnail local and static. Opening a card is the only path that starts its animation.

## Source and Asset Rules

- C06 is sourced from `codex/c06-drilled-hole-poc` commit `54228c2` plus its base C06 implementation commit `20120b6`.
- Only C06-specific runtime files and assets are copied. The legacy `PocIndex`, `PocList`, home-page edits, and Vitest setup remain outside `main`.
- C06's two brick textures are original generated assets, documented by `packages/sample/public/textures/c06/README.md`; no game-source pixels are introduced.
- A04 and C06 thumbnails must be 960x540 local PNGs with hashes pinned in the gallery tests.

## Architecture

`pocGalleryData.ts` remains the sole gallery registry. `App.tsx` owns route registration. C06 uses its focused scene model and the existing texture color-space helper; its focused test is converted to the repository's Node test runner instead of adding Vitest to `main`.

## Acceptance Criteria

- `/poc` contains exactly seven static cards: A11, B10, C03, B05, B06, A04, and C06.
- `/poc/a04` and `/poc/c06` load their respective animation views.
- C06 texture paths resolve beneath Vite's base URL in development and production builds.
- Gallery provenance tests allow only the seven pinned thumbnails and do not introduce Canvas/WebGL into the gallery route itself.
- C06 model, gallery, typecheck, lint, build, and `gallery:check` pass.
