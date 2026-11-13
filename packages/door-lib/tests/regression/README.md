# Frozen old/new animation regression

This suite protects renderer output while refactoring cameraPath. It does not change any runtime preset and does not certify original-game fidelity.

## Check

From the repository root (Node22.23+):

```sh
npm ci
npx playwright install chromium
npm run test:animation
```

- `test:animation:core`: compare every preset/config/audio window and sampled animation state against `baseline/timeline.json`. Samples are40 ms apart plus every timeline event and±1ms. Numeric tolerance is1e-10. Registry additions/removals, Enter/Leave and retired Yellow compatibility are included. A separate check freezes the reference texture/model/audio file bytes against the recorded Git blob identities. Failures name preset/field/time and write `packages/door-lib/test-results/animation-numeric/timeline-diff.json`.
- `test:animation:visual`: compare14 presets×3viewports=42 lossless PNG contact sheets, representing849 sampled frames. Each sheet has4 columns; tiles run left-to-right then top-to-bottom at the timestamps in `visualTimes` and the report attachment. Native renderer pixels are not resized. The actual fade opacity is composited; sample UI labels are excluded.
- Desktop1440×900, tablet768×1024, phone390×844 use the same360p renderer buffer as runtime. The phase/event/midpoint/quarter timestamps are frozen in the old JSON, not regenerated from current code for the visual test.
- Both ordinary root commands `test:lib:core` and `test:lib:browser` include the corresponding new checks. Existing controller, sound-window, vanilla-smoke and device-comparison tests continue to protect Play/resume/Reset/seek/completion, traversal changes, callbacks and gesture/audio synchronization.

The HTML report is `packages/door-lib/test-results/animation-report/index.html`:

```sh
npx playwright show-report packages/door-lib/test-results/animation-report
```

Visual failures retain expected/actual/diff PNGs and a timestamp index. Numeric reports live separately so a subsequent Playwright run does not delete them. Ordinary tests never generate missing baselines; `--update-snapshots` is explicitly rejected. Artifact SHA-256 verification detects baseline edits.

## Provenance and deterministic capture

Initial source: `1b3f83de9ca4ed77fb8e21fcb0c58b7213358910` (reviewed main after PR83). `manifest.json` records its Git tree/blob identities, reason, capture time, Node/Playwright/Chromium versions, OS/architecture, viewports, sample settings and file hashes. The first baseline consists of2082 numerical samples and849 rendered frames across all12 catalog presets plus2 retired Yellow IDs. PNGs total approximately62MiB; they remain test-only and are excluded from the npm package (`files: dist`).

The capture command archives the exact requested commit, installs that tree's own lockfile, and starts a fresh server from that archive. Reference imports, assets and dependencies never resolve through the working checkout. Only the collector/test harness comes from this branch. Runtime/module-resolution environment overrides are cleared, and transformed sample imports must point inside the selected source tree. Test-only instrumentation observes the exact server TextureLoader and GLTFLoader modules: required textures must decode and imported GLB geometries must attach to the rendered scene. Decode/network/browser failures fail capture, including errors swallowed by the production fallback. It then waits for network completion and repeated stable rendered pixels before seeking. A second capture of each sheet must match byte-for-byte.

Chromium is launched with ANGLE SwiftShader, sRGB and DPR1; light color scheme, reduced motion, locale and timezone are fixed. Sampling uses explicit seek times rather than wall-clock playback. Pixel comparison threshold is0.1 with zero pixels allowed above that threshold. The recorded initial environment is macOS arm64 / Chromium151.0.7922.34. An incompatible platform/architecture/browser fails clearly rather than silently skipping or rewriting the oracle. Run in the recorded environment; adding another platform requires its own reviewed baseline. This suite is not wired to an unsupported Linux visual CI runner.

## Intentional refresh only

After an intentional, reviewed animation change exists in a commit:

```sh
npm run baseline:animation -- --ref <full-40-character-old-or-approved-commit> --reason 'why this animation change is approved'
```

This is the only supported write operation. It requires an existing exact SHA and reason, captures to staging, and replaces baseline files only after every preset/viewport succeeds. Uncommitted runtime edits cannot become the oracle. Missing reference assets or capture failure preserve the previous baseline. Review the source commit, timeline diff and PNG changes before committing; do not regenerate simply to make a refactor pass. The initial source is not the currently published npm package; no release or deployment is performed.

## Limits

This detects changes at the recorded samples, including pauses, opening, passage and fade. It is not a mathematical proof for every continuous instant or a recording of the audio waveform. Existing functional/audio tests remain necessary. Strict visual comparisons require the pinned renderer environment; a browser/driver change requires investigation, not relaxed assertions. Hand-authored source-game videos/GIFs/frames are not included.
