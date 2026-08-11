# Door Entrance Monorepo

Two-package workspace:

- `packages/door-lib` (`door-entrance`): reusable React/R3F door entrance animations (`direct-entry`, `top-down-entry`) plus a vanilla mount helper.
- `packages/sample` (`door-entrance-sample`): Vite app showcasing React integration and a plain HTML sample at `/samples/vanilla.html`.

## Quick start

```sh
npm install
npm run build:lib        # builds the library once (tsup)
npm run dev              # runs the sample app (uses the built lib)
```

Useful scripts:
- `npm run dev:lib` (watch build for the library)
- `npm run dev:sample` (Vite dev server for the sample app)
- `npm run build` (build lib then sample)
- `npm run lint` (sample app lint)
- `npm run gallery:check` (verify the published evaluation gallery is internally consistent and the main repo has not reintroduced duplicate evaluation docs)

## Library testing

The door library uses layered tests to keep the core animation package
vanilla-first while React support remains separate:

- `npm run test:lib:core` covers framework-free animation state, presets, sound,
  and controller behavior.
- `npm run test:lib:package` checks public package exports and verifies the
  `door-entrance/vanilla` output graph is React-free.
- `npm run test:lib:browser` runs a browser smoke test for the plain HTML sample:
  mount, canvas rendering, controls, and lifecycle cleanup.
- `npm run verify:lib` / `npm run verify:lib:core` run the current green core
  verification path: library typecheck, build, and core tests.
- `npm run verify:lib:boundary` runs the package-boundary layer.
- `npm run verify:lib:browser` runs core verification plus the browser smoke
  tests.

Current expected status: `npm run verify:lib:core` passes now. Browser
verification requires local dev server binding and a Playwright browser runtime.
Boundary verification is expected to fail until the separate React-free vanilla
renderer migration is complete, because the current `door-entrance/vanilla`
entry is still React-backed.

React behavior should be tested separately when a React adapter exists. Vanilla
tests must not require React, React DOM, or R3F.

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

```tsx
import { DoorEntrance } from "door-entrance";

<DoorEntrance
  variant="top-down-entry"    // or "direct-entry"
  autoPlay
  textureUrl="/textures/door-1.png"
  onComplete={() => console.log("done")}
/>;
```

Plain HTML:

```html
<div id="door-root"></div>
<script type="module">
  import { mountDoorEntrance } from "door-entrance/vanilla";
  mountDoorEntrance({ target: document.getElementById("door-root"), variant: "direct-entry" });
</script>
```
