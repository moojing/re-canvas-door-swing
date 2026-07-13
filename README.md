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
- `npm run gallery:check` (verify the published evaluation gallery matches this repository)

## Evaluation gallery

The ongoing door-video evaluation is published separately at
[moojing/re-door-gallery](https://github.com/moojing/re-door-gallery). The conventional
local checkout is the sibling directory `../re-door-gallery`.

This repository owns the source evaluation documents under `docs/`; the gallery owns
the published `index.html`, `doors.json`, stills, GIFs, and ignored local source assets under
`materials/door-transitions/` and `materials/frame-extracts/`. After changing evaluation records, update the gallery and
run `npm run gallery:check`. Evaluation work is not complete while that check is stale.

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
