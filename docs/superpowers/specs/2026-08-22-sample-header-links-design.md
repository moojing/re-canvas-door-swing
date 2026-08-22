# Sample Header Links Design

## Goal

Add a compact header above the preset catalog so visitors can reach the project documentation and the stakeholder image picker.

## Confirmed Design

Use the selected minimal-header layout: a small `Retro Horror Door` wordmark on the left and two text links on the right. On desktop, the header uses `justify-between` so the wordmark and right-side link group remain at opposite edges; the link group itself may wrap. Each link includes a small external-arrow icon, as shown in the selected preview. The header sits inside the existing centered page container, above the current catalog heading. On narrow screens, its contents wrap without overlapping.

## Links

- `GitHub README` links to `https://github.com/moojing/re-canvas-door-swing#readme`.
- `Stakeholder picker` links to `https://re-door-gallery.pages.dev/stakeholder-selection`.
- Both are external links and open in a new tab with `rel="noreferrer"`.

## Scope

The existing preset cards, modal playback, full-screen transition, and page routing remain unchanged. The implementation is limited to the sample home page and a focused source-level regression test for the two links.

## Verification

The test will assert that each named link has its own expected URL and safe external-link attributes. Existing lint, sample build, and library browser tests will verify that the catalog and playback still work.
