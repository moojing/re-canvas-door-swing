# Detail full-screen preview

User request: add a full-page preview button to animation detail.

Place `Full-screen preview` alongside Play and Reset, with wrapping controls on
narrow screens. Reuse the existing FullScreenDoorTransition rather than adding a
second player implementation. The workbench stops its embedded playback and
passes the selected preset plus current swing direction and calibration timing
edits. Full-screen playback always starts at zero. Completion reveals the same
detail route and restores button focus without changing the embedded seek value.
The containing main element is inert during the overlay.

The shared request accepts optional previewOverrides. Each run applies the
request overrides, or an empty object, after resetting the requested preset so
previous settings cannot leak into a subsequent run. Catalog callers retain their
existing behavior. This is sample UI only; the library API is unchanged.

Verification covers selected preset sound, full viewport bounds, inert background,
focus restoration, retained seek position, calibration timing forwarding and
restoration, mobile detail layout, and existing catalog previews.

Screenshot: [detail controls](../../images/detail-full-screen-button-2026-10-06.png).
