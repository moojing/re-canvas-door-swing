# Developer Animation Verify Pages

## Goal

Give developers a sample-only surface to inspect one door animation at a time
and switch among published presets that share that animation. Keep the client
catalog at `/` unchanged.

## Non-goals

- Do not add a public library API that mixes animation, handle, and texture.
- Do not add unpublished skins, gallery frames, or file-upload texture swapping.
- Do not put a Dev link on the client catalog header.
- Do not reuse `/poc`; those routes stay historic PoCs.

## Routes

- `/dev` redirects to `/dev/animations`.
- `/dev/animations` lists every `doorAnimationConfigs` entry in registry order.
  Each row links to `/dev/animations/:animationId` and shows how many published
  presets use that animation.
- `/dev/animations/:animationId` is the verifier for one animation.
- Unknown `animationId` renders the existing sample 404 page.
- `/dev/animations/:animationId?preset=<presetId>` selects that preset when it
  belongs to the animation; an unknown or mismatched preset falls back to the
  first published preset for that animation.

## Verifier page

- Label the page as developer verify, not the client catalog.
- Mount one large `mountDoorEntrance` player for the selected published preset.
  Keep Play, Reset, timeline seek, and audio-after-Play.
- Show a switcher of published presets where `preset.animation === animationId`.
  Switching updates the `preset` query param and remounts the same animation
  through `mountDoorEntrance({ target, preset })`.
- If only one preset exists for that animation, the switcher still shows it.
- If no published preset uses that animation, show an empty state and do not
  call `mountDoorEntrance`. Never fall through to the library default preset.
- Link back to `/dev/animations`.

## Data

- Read animations from `doorAnimationConfigs`.
- Read presets from `doorEntrancePresets`.
- Derive the switcher with a sample-local helper; do not invent presets in the
  sample that are missing from the library registry.

## Verification

- Source or unit tests lock the two routes, the `/dev` redirect, grouping by
  animation, and the mismatched-preset fallback.
- Browser or equivalent UI check: open `/dev/animations`, enter one animation,
  play, and confirm the client catalog at `/` still has no Dev header link.
- `npm run lint` and the sample production build succeed.
