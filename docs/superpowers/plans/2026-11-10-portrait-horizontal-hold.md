# Keep portrait door edges during approach and holds

User screenshot shows the iron door's left/right edges clipped after approach. The prior implementation only fits the initial pose and removes its correction at approach-end. It also exempts all reference crops, including vertical-only cropping.

## Correction

- Measure the current real panel silhouette every rendered frame, including micro-opening and asymmetric leaves. Cache stable local panel corners, then transform them using the actual current leaf matrices.
- Classify only original horizontal crop as exempt. Vertical crop cannot justify adding horizontal crop on a narrow display.
- Fit horizontal edges inside92% of a portrait container by an analytic camera-space distance bound. Smooth the onset conservatively so the fit remains safe without a hard velocity change.
- Keep full protection through approach, closed waits and micro-open holds; release smoothly after the last hold ends and rejoin the authored camera at passage (or fade start if there is no passage event). Respect opening-resumes/closed-hold-end aliases. This replaces the previous approach-end release.
- Actual mobile playback and comparison share the renderer. Timelines, sound, leaf/accessory motion and landscape calibration remain unchanged.

## Verification

- [x] Reproduce clipping in a failing real-render test, sampling iron approach and holds plus other registered closed-door sources.
- [x] Update helper and renderer; core tests cover horizontal eligibility, smooth safe fit and release timing.
- [x] Verify all11 closed-door presets/traversals through approach, waiting and micro holds, plus initial framing and paused resize.
- [x] Run core/package/browser/lint/build; independent review; inspect the user's iron-door case in shared preview.
- [x] Update documentation and keep local changes reviewable without publication.

## Results

- The new browser regression fails before the fix at iron-door approach/hold samples (including3699ms). After the correction it samples21 approach timestamps plus closed/micro-hold landmarks for all11 registered closed-door presets/traversals and passes.
- 126core＋2local-assets,16package and63full-browser tests pass. Lint has zero errors/three existing Fast Refresh warnings; library/sample build passes with existing bundle/Browserslist warnings.
- Independent review found no substantive issues in current geometry, analytic safe bound, C1 onset, source horizontal-crop classification, release events or resize lifecycle.
- Shared T3 preview fully reloaded and iron sought to1200ms/24%. Live WebGL readback verifies phone edges atx6..159 in a166px buffer (about4% margins); desktop and tablet retain their existing silhouettes. Snapshot capture intermittently failed, so no new screenshot artifact is claimed as verification.
- No preset/set tracks, source assets, reference observations, counts or package versions changed. Local branch only; no publication/merge.
