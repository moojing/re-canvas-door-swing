# Full-Screen Page Transition Demo Design

**Date:** 2026-08-21

## Goal

Document and demonstrate how a site can play a selected `retro-horror-door`
preset across the full viewport before it navigates to the next page.

## Scope

- Add a dedicated transition-demo card below the sample preset catalog.
- Let the visitor choose one registered preset and start a real full-screen
  transition from a user click.
- Navigate to `/transition-complete` only after the animation finishes.
- Provide a return button on `/transition-complete` back to the catalog.
- Add a framework-neutral README example using the same lifecycle.
- Add browser coverage for overlay display, navigation after completion, and
  returning to the catalog.

The existing preset detail modal remains an inspection and playback surface.
It will not gain a second full-screen transition control.

## Interaction Design

The catalog gets one unframed full-width transition-demo band after the preset
grid. It contains a native select menu populated from `doorEntrancePresets`,
a short explanation, and one clear command button: **Start full-screen
transition**.

When the button is clicked:

1. The fullscreen layer becomes visible above the catalog.
2. The selected preset begins from progress zero with its sound.
3. The catalog below becomes `inert`, and focus moves to the fullscreen layer,
   so keyboard interaction cannot reach controls behind the transition. The
   layer is a programmatically focusable (`tabIndex={-1}`) named status region
   with `aria-live="polite"` and the announcement “Page transition in
   progress”.
4. After the renderer invokes `onComplete`, React Router navigates to
   `/transition-complete`.
5. The destination page shows the selected preset label and a **Return to
   preset catalog** button.

The transition intentionally has no cancel control. It is a page-change
commitment rather than a preview modal.

## Architecture

### Persistent transition layer

Create `packages/sample/src/components/FullScreenDoorTransition.tsx`. It owns
one full-viewport target and mounts `mountDoorEntrance` exactly once when the
catalog page loads. It renders as a sibling of the catalog `main`, never inside
the subtree that becomes `inert`. While idle the layer remains mounted and
viewport-sized but is visually transparent and has no pointer interaction; it
must not use `display: none`, because the renderer needs dimensions before
playback.

The component exposes an imperative `play({ preset, destination })` method to
its parent. On the trigger button's click handler, `Index.tsx` calls this
method synchronously. The method stores the destination in a ref, reveals the
layer, resets the renderer to the selected preset, then calls `play(preset)`.
Calling `play` inside the actual click handler preserves browser user
activation so the opening sound can unlock and play.

The component keeps an internal running guard. Once a transition starts it
ignores further `play` calls until completion or unmount; the catalog command
button also becomes disabled immediately. This prevents a second click from
replacing the selected preset or destination. `onComplete` is processed once.

At completion, the component uses the stored destination and invokes its
`onComplete` callback. `Index.tsx` navigates with React Router to
`/transition-complete`, passing the selected preset id in location state. The
component cleanup unmounts the vanilla renderer when the catalog route itself
unmounts.

### Sample pages

`Index.tsx` owns the selected demo preset id and renders the demo band plus the
persistent `FullScreenDoorTransition`. It continues to render actual canvas
previews and the existing detail modal unchanged.

Create `packages/sample/src/pages/TransitionComplete.tsx` for the destination
route. It derives a readable preset label from route state when present and
falls back to a generic destination confirmation for a direct visit. Its return
control is a React Router `Link` to `/`.

`App.tsx` registers `/transition-complete`.

### README

Add a **Full-screen page transitions** section to the root README. It shows a
framework-neutral pattern:

- create a fixed, viewport-sized overlay at application startup;
- mount the door renderer into that overlay with `autoPlay: false`;
- reveal the overlay and call `door.play()` within the link/button click;
- navigate from `onComplete`.

The example uses opacity and pointer-events to hide the mounted layer rather
than `display: none`. It gives the overlay viewport dimensions before mounting,
calls `reset(selectedPreset)` before `play(selectedPreset)`, and clearly states
that `play()` should be invoked from a user gesture to allow sound.

## Error and Cleanup Behavior

- The renderer mounts synchronously and can play immediately. Texture and audio
  assets load progressively, so the demo command does not need an artificial
  readiness delay.
- If the catalog unmounts before completion, the component unmounts its
  renderer and leaves no audio or animation frame running.
- A direct visit to `/transition-complete` remains valid and has a working
  return control even without route state.
- The renderer's texture and audio loading are progressive: a failed asset may
  degrade its appearance or silence its sound, but the opening timeline still
  completes and the visitor is not stranded behind the overlay. The library
  exposes no asset-error callback, so the sample does not invent a retry state.

## Tests

Extend `packages/door-lib/tests/browser/preset-catalog.test.ts`:

1. Verify the demo select and start button are available, then begin a
   transition.
2. Choose `double-lever-wood`, start the transition, and verify the fullscreen
   transition canvas becomes visible before navigation, the catalog is inert,
   and the transition audio starts from the click path.
3. Wait for `/transition-complete`, verify the selected preset label and return
   button, then return to `/`.
4. Verify repeated start clicks do not create a second transition or change the
   destination; verify an in-progress route unmount cleans up the transition.
5. Preserve the existing catalog/modal, timeline, audio, and mobile-close
   coverage.

Run `npm run test:lib:browser`, `npm run test:lib:package`, `npm run lint`,
and `npm run build` before the implementation PR.
