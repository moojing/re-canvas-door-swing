# Retro Horror Door Monorepo

**Language:** [English](README.md) | [繁體中文](README.zh-TW.md)

Two-package workspace:

- `packages/door-lib` (`retro-horror-door`): reusable retro horror door transitions with a vanilla JS API.
- `packages/sample` (`retro-horror-door-sample`): Vite development app. Its home page is a playable preset catalog; it also keeps the PoC gallery and a plain HTML vanilla example.

## Quick start

```sh
npm install
npm run build:lib        # builds the library once (tsup)
npm run dev              # runs the sample app (uses the built lib)
```

Open `http://127.0.0.1:5173/` to browse every published preset. Each card
shows the renderer's initial frame; **Open preset** opens a modal with the
same vanilla renderer, playback controls, sound, and a seekable timeline.
The older technical PoCs remain available at `/poc`, and the standalone HTML
example is at `/samples/vanilla.html`.

Useful scripts:
- `npm run dev:lib` (watch build for the library)
- `npm run dev:sample` (Vite dev server for the sample app)
- `npm run build` (build lib then sample)
- `npm run lint` (sample app lint)
- `npm run gallery:check` (verify the published evaluation gallery is internally consistent and the main repo has not reintroduced duplicate evaluation docs)

## Library testing

The door library uses layered tests to keep the package framework-free:

- `npm run test:lib:core` covers framework-free animation state, presets, sound,
  and controller behavior.
- `npm run test:lib:package` checks public package exports and verifies the
  default `retro-horror-door` entry and `retro-horror-door/vanilla` output graphs are React-free.
- `npm run test:lib:browser` runs browser coverage for the plain HTML mount and
  the preset catalog: canvas rendering, playback, sound, modal lifecycle,
  timeline seeking, and the mobile close control.
- `npm run verify:lib` / `npm run verify:lib:core` run the current green core
  verification path: library typecheck, build, and core tests.
- `npm run verify:lib:boundary` runs the package-boundary layer.
- `npm run verify:lib:browser` runs core verification plus the browser smoke
  tests.

Run `npm run verify:lib:browser` before publishing a renderer or catalog
change. Browser verification requires local dev-server binding and an
installed Playwright browser runtime.

The library does not install or publish React, React DOM, or R3F dependencies.

## Evaluation gallery

The ongoing door-video evaluation lives at
[moojing/re-door-gallery](https://github.com/moojing/re-door-gallery). The conventional
local checkout is the sibling directory `../re-door-gallery`.

`../re-door-gallery/docs/` is the single source of truth for the three evaluation records:
`door-classifications.md`, `door-classification-report.md`, and
`Doors-Difficulity-Estimation.xlsm.csv`. This repository keeps the tooling and guardrails
around those records, but should not track duplicate copies locally. After changing
evaluation records, run `npm run gallery:check`. Evaluation work is not complete while that
check is stale.

## Using the library

```ts
import { mountDoorEntrance } from "retro-horror-door";

mountDoorEntrance({
  target: document.getElementById("door-root"),
  preset: "single-lever-wood",
});
```

Random selection chooses from available runtime presets; it does not mix door
parts manually:

```tsx
mountDoorEntrance({
  target: document.getElementById("door-root"),
  random: true,
  type: "single",
});
```

Plain HTML:

```html
<div id="door-root"></div>
<script type="module">
  import { mountDoorEntrance } from "retro-horror-door";
  mountDoorEntrance({
    target: document.getElementById("door-root"),
    preset: "single-lever-wood"
  });
</script>
```

Runtime preset entries contain only playable library settings such as type,
motion, handle, material, sound, and camera behavior. A preset can also
provide `frontTextureUrl`, `edgeTextureUrl`, and `backTextureUrl`: when edge
or back is absent it inherits the front texture. The legacy `textureUrl`
field remains supported and applies the same texture to all three surfaces.
Source videos,
classification notes, and thumbnail references belong in development tracking
docs and are not shipped in the npm package.

## Full-screen page transitions

For a page change, mount one viewport-sized vanilla door overlay when the app
starts. Keep the overlay in the DOM, but hide its idle state with opacity and
`pointer-events` rather than `display: none`. This ensures the renderer is
already sized and ready when a user starts the transition.

Call `reset()` and `play()` synchronously from the user action that triggers
navigation. The click is necessary for browsers to permit door audio. Navigate
only from `onComplete`, so the outgoing page remains visible until the selected
preset has finished.

```ts
import { mountDoorEntrance } from "retro-horror-door";

const overlay = document.getElementById("door-transition");
const door = mountDoorEntrance({
  target: overlay,
  preset: "single-lever-wood",
  autoPlay: false,
  className: "h-full w-full border-0 bg-black",
  onComplete: () => window.location.assign("/next-page"),
});

document.querySelector("#continue")?.addEventListener("click", () => {
  const preset = "double-lever-wood";
  overlay?.classList.add("is-visible");
  door.reset(preset);
  door.play(preset);
});
```

The sample catalog includes this flow on each preset card.
