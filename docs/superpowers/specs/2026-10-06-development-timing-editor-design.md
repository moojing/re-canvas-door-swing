# Development-only timing editor

The user approved retaining timing calibration tools while hiding them from
customers. Keep the shared detail page, stage seconds, seek, Play, Reset, swing
preview, and preset information. Gate only stage timing sliders and their
explanatory copy with `import.meta.env.DEV` and an explicit
`VITE_DOOR_TIMING_EDITOR=true` opt-in. Production builds always hide them.

Normal `npm run dev` hides the editor. `npm run dev:calibration` selects Vite's
calibration mode, loading a committed `.env.calibration` containing the flag.
This is a developer command, not a customer UI switch or URL option. Existing
Restore remains useful for the swing preview and also clears timing edits in
calibration mode. No library API or authored profile changes are required.

Browser coverage must verify normal preview controls with no timing sliders,
and keep timing-edit regressions running against the opt-in calibration server.
Also verify a production build with the opt-in flag still hides the editor.

## Visual evidence

- [Ordinary detail](../../images/detail-normal-2026-10-06.png): stage seconds
  and seek remain; timing sliders and timing-specific instructions are absent.
- [Calibration detail](../../images/detail-calibration-2026-10-06.png): the
  existing preview-only stage editors remain available.

Implemented and verified on 2026-10-06: 30 browser tests, lint, and full build
passed. The built-page test sets the opt-in flag to true during production
compilation and verifies the editor remains hidden. Existing lint/build
warnings remain unchanged. No library profiles or API were changed.
