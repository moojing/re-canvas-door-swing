# Retro Horror Door Sample

This Vite app is the development and visual verification surface for the
`retro-horror-door` package. React is used only for the sample UI; every door
canvas is mounted through the library's vanilla `mountDoorEntrance` API.

## Run locally

Run these commands from the repository root:

```sh
npm install
npm run build:lib
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Routes

- `/`: playable preset catalog. Each card is a real initial renderer frame.
  Selecting a card opens a modal with Play, Reset, timeline seeking, sound,
  and the `mountDoorEntrance` usage for that preset.
- `/samples/vanilla.html`: minimal non-React mounting example.

## Development notes

- The catalog reads `doorEntrancePresets` from the published library entry.
  Do not duplicate the preset registry in the sample.
- `PresetAnimationPreview.tsx` and `PresetDetailModal.tsx` both mount the
  vanilla renderer so the preview and interactive scene use the same geometry,
  materials, lighting, and opening behavior.
- Library-owned default textures and sounds are bundled from
  `packages/door-lib/src/assets/`. Files in this package's `public/` directory
  are sample assets only.

## Verification

```sh
npm run test:lib:browser
npm run lint
npm run build
```

The browser suite covers the catalog modal, timeline, initial canvas preview,
audio after Play, and the standalone vanilla sample.
