# Full-Screen Page Transition Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a documented, playable sample of a selected door preset that fills the viewport and navigates only after its animation completes.

**Architecture:** Keep the full-screen vanilla renderer mounted as a sibling of the catalog `main`, so the catalog can be made inert while the renderer remains focusable. `Index.tsx` owns selection and navigation, while a focused `FullScreenDoorTransition` component owns the renderer lifecycle and prevents re-entry. A separate destination route demonstrates the completed page change.

**Tech Stack:** React 18, React Router, TypeScript, Tailwind CSS, `retro-horror-door` vanilla API, Playwright.

---

### Task 1: Define browser behavior before implementation

**Files:**
- Modify: `packages/door-lib/tests/browser/preset-catalog.test.ts`

- [ ] **Step 1: Write failing full-screen transition coverage**

Add Playwright coverage that:

```ts
test("catalog demo plays a selected preset full-screen before navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Transition preset" }).selectOption("double-lever-wood");
  await page.getByRole("button", { name: "Start full-screen transition" }).click();
  await expect(page.getByRole("status", { name: "Page transition in progress" })).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("inert", "");
  await expect(page.getByRole("status")).toBeFocused();
  await expect(page.getByRole("status").locator("canvas")).toBeVisible();
  await expect.poll(() => page.getByRole("status").locator("audio").evaluate((audio) => !audio.paused)).toBe(true);
  await expect(page).toHaveURL(/\/transition-complete$/);
  await expect(page.getByRole("heading", { name: "Destination reached" })).toBeVisible();
  await expect(page.getByText("Double Lever Wood")).toBeVisible();
});
```

Add tests that return with the named catalog link, directly visit
`/transition-complete` without route state, and verify its generic copy and
return link. Add a duplicate-click assertion that the transition control
becomes disabled after the first start, only one transition status/canvas is
present, and the first selected preset is the one named at the destination.
This verifies all re-entry behavior a visitor can trigger without exposing a
test-only transition API. After a transition starts, navigate to another sample
route and verify the status overlay and its audio element disappear, proving
the catalog route unmount removes the mounted renderer. Before the test loads
the page, instrument `HTMLMediaElement.prototype.pause` with `addInitScript`
and count pauses only when `this.closest('[role="status"]')` is present; after
the route change assert that the transition audio pause count is positive.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `npm run test:lib:browser -- --grep "full-screen transition"`

Expected: FAIL because the combobox, status region, and destination route do
not exist.

### Task 2: Implement the reusable fullscreen renderer layer

**Files:**
- Create: `packages/sample/src/components/FullScreenDoorTransition.tsx`

- [ ] **Step 1: Implement the public ref contract**

Export a `FullScreenDoorTransitionHandle` with:

```ts
play: (request: {
  preset: DoorEntrancePresetId;
  destination: string;
}) => void;
```

Use `forwardRef` and mount `mountDoorEntrance` once into a full-viewport target
in `useEffect`, with `autoPlay: false` and a `className` that fills the target.
The wrapper is fixed with an explicit high z-index. Idle state stays mounted,
viewport-sized, transparent, `pointer-events: none`, and `aria-hidden`; active
state is opaque, receives pointer blocking, and is not `aria-hidden`. It must
never use `display: none`.

- [ ] **Step 2: Implement interaction isolation and re-entry protection**

When `play` is called, use a ref-backed running guard, retain the first
`destination` alongside its preset, call `door.reset(preset)` then
`door.play(preset)` synchronously after revealing the layer, focus its
`tabIndex={-1}` status wrapper from a `useLayoutEffect` keyed to the committed
active state, and call `onActiveChange(true)`. Keep `door.play()` in the click
path so its sound unlock remains a user gesture. Ignore calls while running.
Set `role="status"`,
`aria-label="Page transition in progress"`, and `aria-live="polite"` on the
wrapper.

On the single `onComplete`, call `onComplete({ preset, destination })`. Clean
up audio and the renderer with `unmount()` on component unmount.

- [ ] **Step 3: Run the focused test to verify progress**

Run: `npm run test:lib:browser -- --grep "full-screen transition"`

Expected: it still fails until the catalog trigger and destination route exist,
but the status region and canvas assertions can now be satisfied manually.

### Task 3: Add the catalog demonstration and destination page

**Files:**
- Modify: `packages/sample/src/pages/Index.tsx`
- Create: `packages/sample/src/pages/TransitionComplete.tsx`
- Modify: `packages/sample/src/App.tsx`

- [ ] **Step 1: Add the transition demo band**

Place an unframed full-width section after the catalog grid. Build its select
options directly from `doorEntrancePresets`, label it `Transition preset`, and
give the command button the accessible name `Start full-screen transition`.
Keep this state separate from the preset-detail selection.

- [ ] **Step 2: Connect the mounted overlay**

Render `FullScreenDoorTransition` as a sibling of the catalog `main`. Give the
catalog main a ref; set or remove its `inert` attribute through an
`onActiveChange` callback. Disable the demo command after the first click. Call
`transitionRef.current.play({ preset, destination: "/transition-complete" })`;
on completion, use the returned destination for `navigate(destination, {
state: { presetId } })`.

- [ ] **Step 3: Create the completed destination**

Use `useLocation` to read the optional preset id, resolve its label with
`doorEntrancePresetMap`, and render the heading `Destination reached`. Add a
React Router `Link` named `Return to preset catalog` to `/`. Direct visits use
generic copy rather than throwing on missing state.

- [ ] **Step 4: Register the route**

Add `/transition-complete` in `App.tsx` before the catch-all route.

- [ ] **Step 5: Run the focused browser test to verify GREEN**

Run: `npm run test:lib:browser -- --grep "full-screen transition"`

Expected: PASS. Confirm the status canvas appears before the destination URL,
the catalog is inert while active, the destination names the chosen preset, and
the return link works.

### Task 4: Document the integration lifecycle

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the framework-neutral README example**

Document a fixed overlay that exists before a link is clicked. The example must
mount with `autoPlay: false`, set the layer to full viewport dimensions, call
`reset(selectedPreset)` and `play(selectedPreset)` inside a click handler, and
navigate only from `onComplete`. Explain why the hidden layer uses opacity and
pointer-events rather than `display: none`, and why a click gesture is required
for sound.

### Task 5: Full verification

**Files:**
- Test: `packages/door-lib/tests/browser/preset-catalog.test.ts`

- [ ] **Step 1: Run browser coverage**

Run: `npm run test:lib:browser`

Expected: all existing tests plus transition coverage pass.

- [ ] **Step 2: Run package boundary tests**

Run: `npm run test:lib:package`

Expected: package remains React-free and all boundary tests pass.

- [ ] **Step 3: Run lint and production build**

Run: `npm run lint`

Run: `npm run build`

Expected: no errors. Report the three existing Fast Refresh warnings if they
remain.

- [ ] **Step 4: Inspect the visual result**

Run the sample dev server and verify the full-screen layer fills desktop and
mobile viewports, contains no frame or catalog UI during playback, plays sound
from the click, reaches the destination, and returns to the catalog.

- [ ] **Step 5: Commit**

```bash
git add README.md packages/sample/src/components/FullScreenDoorTransition.tsx packages/sample/src/pages/Index.tsx packages/sample/src/pages/TransitionComplete.tsx packages/sample/src/App.tsx packages/door-lib/tests/browser/preset-catalog.test.ts docs/superpowers/specs/2026-08-21-full-screen-page-transition-demo-design.md docs/superpowers/plans/2026-08-22-full-screen-page-transition-demo.md
git commit -m "feat: add full-screen transition sample"
```
