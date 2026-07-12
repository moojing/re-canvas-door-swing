# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is an **npm workspaces monorepo** with two packages:

- `packages/door-lib/` — the `door-entrance` library (publishable). A React Three Fiber door-opening transition component, also mountable from vanilla JS.
- `packages/sample/` — the `door-entrance-sample` demo app (private). A Vite + React site that showcases the library and hosts its runtime assets. Deployed to GitHub Pages.

Repo-level docs live in `docs/` — notably `docs/technical-debt/` which tracks known debt items and their decisions.

## Development Commands

Run from the repo root:

- `npm i` — install all workspace dependencies
- `npm run dev` — start the sample app dev server (Vite, http://127.0.0.1:5173)
- `npm run dev:lib` — build the library in watch mode (tsup)
- `npm run build` — build library, then sample
- `npm run build:lib` / `npm run build:sample` — build one package
- `npm run lint` — ESLint (sample workspace only; the library has no lint script)

No test framework is configured in either package.

## Library: `packages/door-lib` (`door-entrance`)

- **Build**: tsup, dual entry points → `dist/index.{js,cjs}` and `dist/vanilla.{js,cjs}` with `.d.ts`. Only `dist/` is published.
- **Peer deps**: `react` ^18, `@react-three/fiber` ^8, `three` ^0.133.
- **TypeScript**: `strict: true`.

### Source structure (`src/module/`)

- `DoorEntrance.tsx` — main React component. Renders a full-screen R3F canvas, drives the animation timeline, plays the door sound, exposes a `DoorEntranceHandle` imperative ref, and calls `onComplete` when the transition ends.
- `animations/` — one folder per animation variant, each exporting a config + renderer:
  - `direct-entry` — single door swings open, camera moves through
  - `top-down-entry` — single door viewed top-down (`single-top-down-entry` variant id)
  - `double-swing` — double doors swing open
  - `shared.ts` — shared helpers (easing functions, handle-press progress); `HandleModel.tsx` — GLTF door-handle loader; `animation.template.ts` — boilerplate for adding a new variant
- `presets.ts` — preset map (`door-single`, `door-single-overhead`, `door-double`) binding a variant to default texture/handle/sound URLs.
- `handles/` — handle profile definitions (`profiles.ts`) and handle motion (`motion.ts`).
- `assets/textures.ts` — texture manifest with string paths and `getTextureUrl(id, base)` helper.
- `types.ts` — public types (`DoorAnimationVariant`, `DoorEntrancePreset`, sound progress options, etc.).
- `vanilla.tsx` — `mountDoorEntrance(...)`, wraps the React component for non-React consumers (exported as the `door-entrance/vanilla` subpath).

### Asset caveat (known tech debt)

Default texture/sound/model paths in `presets.ts` are plain strings (`textures/door-1.png`, `sounds/*.mp3`) resolved against the **consumer's** public root — the actual files live in `packages/sample/public/`. The library is not self-contained; the decided fix (bundler imports) is documented in `docs/technical-debt/door-texture-asset-ownership.md` and not yet implemented.

## Sample App: `packages/sample`

- **Stack**: Vite + `@vitejs/plugin-react`, Tailwind CSS + shadcn/ui (`src/components/ui/`), React Router DOM, TanStack React Query, lovable-tagger (dev mode only).
- **Vite config**: dev server on `127.0.0.1:5173`; `base` is `/re-canvas-door-swing/` in production builds (GitHub Pages); path alias `@/` → `src/`.
- **Routing**: `src/App.tsx` with `BrowserRouter basename={import.meta.env.BASE_URL}` — `/` → `pages/Index.tsx`, `*` → `pages/NotFound.tsx`.
- **Demo code**: `src/sample/ReactSample.tsx` (React usage) and `src/sample/vanillaEntry.ts` (vanilla `mountDoorEntrance` usage), both embedded in the Index page.
- **Assets**: `public/textures/`, `public/sounds/`, `public/models/` — these also back the library's default presets (see asset caveat above).
- **TypeScript**: non-strict (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`) — unlike the library.

## Conventions

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`), short lowercase scopes.
- New animation variants: start from `animations/animation.template.ts`, register the variant in `animations/index.ts` and (optionally) a preset in `presets.ts`.
- Verification is manual — exercise the door animations and texture/sound loading in the sample app before opening a PR.
