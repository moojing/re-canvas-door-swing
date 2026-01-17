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
