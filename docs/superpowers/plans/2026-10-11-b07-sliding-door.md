# B07 Automatic Sliding Door Implementation Plan

Goal: implement only #41 source `1-1/b07/b07-s1雙門自動門.mp4`, preserving all hinge behavior and registry-driven catalog rendering.

Design approved by the user's selection of the proposed center-split sliding example. Extend state/profile with optional per-leaf XYZ displacement tracks rather than overloading angles. Add center-split-slide animation navigation and slide-double motion, reusable1996 approach/hold/slide/pass set and complete Enter/Leave presets based on the two observed source segments. Both faces use original generated gray steel albedo, mirrored per leaf so windows and push plates correspond. No accessory, frame or scene geometry.

1. Write failing core tests for accessory-free preset selection, zero rotation, symmetric displacement, camera wait, sound window and preview retiming.
2. Extend types/profile validation, sampling and retiming; register motion-compatible set and animation config. Implement renderer leaf translation and mirrored right-leaf UVs.
3. Install generated WebP in door-assets, export local/CDN/types and library URLs, wire presets.
4. Update registry/catalog expectations; add browser pixel checks for symmetric gap, fade visibility, reset and sound/play controls; run core/package/browser/lint/build.
5. Inspect actual sample at closed, opening, passage and fade in both traversals; compare local MP4; document observations vs fitted values.
6. Independently review implementation, fix justified findings, sync #41/#63/repo/Project as local work, leave preview running. No merge or release in implementation scope. finish-ticket must ask user to confirm final reviewed PR before merge.

Separate requested change: remove implicit merge authorization from finish-ticket, update YAML and verify approval/silence/head-change scenarios. Preserve unrelated2026-10-02 plan and sibling gallery edits.
