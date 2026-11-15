# Phone camera framing

User approved independent phone framing on 2026-11-15 after discussing temporary AI/human calibration controls.

The authoring workbench is a communication tool. Drafts disappear on reload; no persistence, export, file versioning, templates or automatic Enter/Leave sharing is required in this scope. AI can subsequently edit source code from the author's feedback.

Add optional phone-only initial/approach height percentages and horizontal/vertical composition offsets. Blank heights inherit shared values, blank offsets mean zero. Individual height support follows the existing closed-phase anchors. Values use existing 20–200 height bounds and ±50% viewport offsets. Positive offsets move the image right/up. Heights retain the existing pre-responsive closed-door projection definition; portrait fitting can alter the final visible extent, which must be checked in comparison. Do not claim exact final viewport height after fitting.

Use logical renderer dimensions, with short side ≤600 CSS pixels identifying phone previews (including landscape). CSS-scaled comparison uses its logical 390×844 target; desktop/tablet/reference remain shared. Fullscreen uses the same rule and responds to resize without restarting playback. Actual device identity is not detected.

Keep phone framing separate from timing and pace. Resolve a phone animation configuration by replacing only framing fields on the shared camera draft. It has identical duration, phase events and non-camera tracks. The renderer chooses the camera configuration on render/resize; world-space portrait compensation remains unchanged. Apply composition via a projection view offset after responsive fitting, without rotating or translating the camera around the door. Reset clears prior projection offsets on resize/scope changes.

Phone draft fields are validated and copied before adoption, remain isolated per preset, survive Reset/layout switching, and clear with Restore/reload. Controls remain calibration-only. Invalid values retain the last valid preview. Empty overrides preserve existing rendering.

Verify actual canvases: only phone changes; inherited behavior restores byte-identical rendering; timing stays shared; layout/traversal/restore/reload work; fullscreen resizing clears phone projection outside the phone breakpoint. Run core/package/browser checks and lint/build. This changes authoring only and does not establish source-film fidelity.
