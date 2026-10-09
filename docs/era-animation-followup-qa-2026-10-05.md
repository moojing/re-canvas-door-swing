# Era timing follow-up QA — 2026-10-05

This review continues PR #60 from `0237f1a`. It does not close issue #58.
The worktree and the sibling gallery were checked. The sample was restarted at
`http://127.0.0.1:5176`; the five existing animations were reused.

## Scope and method

- Inspected actual `mountDoorEntrance` output for all five presets at closed,
  slight-open or closed-wait end, pause end, open end, passage, and fade start.
  A temporary browser-only contact sheet sampled 34 rendered canvas frames;
  it does not capture the DOM fade overlay and is not a fade comparison.
- Confirmed the parking preview's DOM fade opacity at 98% progress is 0.52,
  matching its 4.60–4.80 s fade window. This checks interpolation, not fidelity
  to the original film's brightness curve.
- Read the existing gallery contact sheets for 1996 A-1 and 1998 A-1.
  Re-extracted the exact yellow `a02-s5`, blue `b02-s5`, and parking return
  passages. New source frames remain local-only in the gallery under
  `materials/frame-extracts/era-qa-2026-10-05/`.
- The gallery's existing camera review and the calibration note remain the
  source records. No classification or estimation data was changed.

## Visual observations and remaining work

| Preset | Observed implementation | Remaining reference QA |
| --- | --- | --- |
| 1996 A-1 iron | Closed approach, a small opening held through pause end, renewed opening, and the back/edge during passage are visible. | Original `pause-001.jpg` fades around file 6.6 s while the leaf is still visibly oblique. The implementation reaches 90° at local 4.30 s (approximately file 6.17 s) and advances the camera before fading. Opening amplitude and the passage/fade overlap need fitting; do not mark the full reference comparison passed. |
| 1998 A-1 no handle | Initial composition stays fixed; slight-open and pause-end samples agree; opening and passage continue afterward. Mirrored front features appear on the opposite side from the 1996 preset. | Source `pause-022.jpg` supports the held interval and later passage, but the final camera/angle fit and back-face direction certification are still pending. |
| 1999 A-1 parking | Door remains closed at 3.10 s, then opens continuously; passage clears the center. No post-open pause marker is present. | First-passage source supports this sequence. The return passage changes the visible handle to the left; a published paired reverse preset and its front/back/hinge QA are absent. |
| 1996 A-2 yellow knob | Closed approach, small held opening, continued opening, and handle geometry remain visible. | Exact `a02-s5` frames show a slow interval around file 5.0–5.6 s, followed by renewed opening. A knob frame can confirm presence but cannot certify its rotation; continuous playback/audio and final amplitude/camera fitting remain pending. |
| 1996 B-2 blue double | Both leaves have a held small opening, then open together; central handles stay attached to their leaves. | Exact `b02-s5` frames show a small opening/slow interval before renewed opening near file 5.6–5.9 s and early fade around 6.2–6.4 s. Runtime opens farther before its fade. Final angles, fade overlap, and handle rotation require continuous comparison. |

The existing authored direction and texture settings were retained. The preview
swing toggle alone does not demonstrate a reverse traversal: the starting face,
hinge side, handle side, and physical swing must also agree. No new textures,
models, preset variants, or arbitrary public mixing controls were introduced.

## Independent code review

Read-only review of the original PR found its timing-scope structure consistent
with the design: explicit era assignments, shared absolute clock, independent
tracks, preview-only phase edits, and legacy behavior. It found two audio issues:

1. Legal parking timing edits (`open-end: 3110`, `passage: 3120`) produce a
   20 ms sound window. A 6.24 s source cropped to 30% requires rate 93.6,
   which Chromium rejects with `NotSupportedError`. The exception aborts
   preview updates and subsequent seek/play.
2. An outstanding first-play audio-unlock promise can complete after a seek
   or timing edit and unconditionally reset the newly mapped audio position
   to zero. The helper predates this PR; the new timing-edit flow exposes it.

Both findings were fixed and independently re-reviewed. Unsupported native
rates now pause/skip the affected sound window while visual playback, seek,
and Reset continue; no clamped rate silently changes the source mapping.
Restore and same-mount preset switching recover supported sound playback.
The pending unlock resets audio time only while its captured generation still
owns that operation, preserving seek/retiming and audible resume.

Each regression failed before its fix: Chromium rejected rate 93.6, and delayed
unlock changed the expected audio position 1.02553 s to zero. Both passed after
the fixes. Full follow-up verification passed: core 54, local assets 2, package
15, browser 28 (with `DOOR_TEST_URL=http://127.0.0.1:5176`), lint, and build.
Lint retains three existing React refresh warnings; build also reports stale
Browserslist data and its existing large-bundle warning. An initial build was
blocked by an installed esbuild JS/native version mismatch; reinstalling the
lockfile's optional dependencies repaired the local installation without
changing the lockfile.

The review is an agent review, not a GitHub approval; PR #60 had no submitted
GitHub reviews when checked. Issue #58's reverse variant and complete visual
fidelity acceptance remain open.
