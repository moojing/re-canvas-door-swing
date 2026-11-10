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
  View details opens the selected preset on its animation detail page;
  Full-screen preview plays the animation over the catalog.
- `/dev/animations`: animation list. Its cards open `/dev/animations/:animationId`.
- `/dev/animations/:animationId`: shared detail page with Play, Reset, timeline
  seeking, authored Enter/Leave variants, Back navigation, and the published
  `mountDoorEntrance` usage. Choose **Compare devices** to view Desktop
  (1440×900), Tablet (768×1024), and Phone (390×844) together. Each viewport
  renders at its own logical size and scales to fit. All three share playback,
  seeking, Reset and preview timing edits; only Desktop plays sound. Switching
  between Single preview and Compare devices pauses and retains progress.
  Comparison stacks on narrow screens and remains selected when changing
  traversal. Full-screen preview still uses the actual browser viewport.
  Narrow portrait containers automatically pull back initially complete doors
  that would otherwise be clipped, then smoothly rejoin the existing approach.
  Originally cropped openings and already complete views retain their framing;
  the library applies the same rule to comparison and actual playback.
- `/samples/vanilla.html`: minimal non-React mounting example.

## Development notes

- The catalog reads `doorEntrancePresets` from the published library entry.
  Do not duplicate the preset registry in the sample.
- `PresetAnimationPreview.tsx` and `AnimationPreviewWorkbench.tsx` both mount the
  vanilla renderer so the catalog and detail page use the same geometry,
  materials, lighting, and opening behavior.
- Library-owned default textures and sounds are bundled from
  `packages/door-assets/`. Files in this package's `public/` directory
  are sample assets only.

## Verification

```sh
npm run test:lib:browser
npm run lint
npm run build
```

The browser suite covers catalog navigation, detail controls, the full-screen
preview, initial canvas frames, audio after Play, and the standalone vanilla sample.
