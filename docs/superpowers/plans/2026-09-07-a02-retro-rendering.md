# A02 Retro Rendering Implementation Plan

**Goal:** Apply the user-approved dark yellow-brown, coarse-pixel horror treatment to the A02 preset.

**Architecture:** Keep original runtime textures and the shared direct-entry animation. An internal preset look selector controls low-resolution drawing, coarse texture sampling, subdued warm lighting and subtle ordered color dithering. Do not expose arbitrary look mixing in the public mount API.

**Tech Stack:** TypeScript, Three.js, Vite, Playwright.

- [x] Add behavior tests for preset isolation and drawing-buffer sizing, including HiDPI and small containers.
- [x] Implement internal look sizing and material shader helpers; wire preset changes, texture loading, lighting and resize into vanilla.ts.
- [x] Inspect the original clip and preview closed, opening and rear views; tune appearance without changing shared motion without evidence.
- [x] Run core, package, browser tests, lint and build. Leave the sample available and record verification.

The user approved this direction and explicitly requested implementation after a clean-worktree check. Starting commit: 2fb48d5. Reference videos remain only in the sibling gallery.

## Verification

- Core: 34 passed; package: 14 passed; browser: 9 passed.
- Lint: no errors, three existing Fast Refresh warnings in sample UI components.
- Build: passed; existing sample chunk-size warning remains.
- Visual QA: inspected closed, 55% opening, 65% edge exit and 80% black transition states in the sample. Front/back surfaces receive the same treatment; edge sampling now uses a wood stile strip. Imported handle receives the same coarse sampling and matte finish.
- Retained shared door-leaf and camera timing and recorded audio. The direct-entry knob now turns 65 degrees over 1.05 seconds with smooth easing.
- Follow-up visual tuning: 360px drawing-buffer height, 192×384 texture sampling, smooth enlargement and 30% ordered-dither blend.
- Split the existing knob asset into a fixed base and axial rotating grip, preserving source triangles and overall scale. Moved front/back knobs outward to a 0.2-unit edge inset so the base clears the recessed panel.
- Original generated WebP files remain unchanged; no reference frames or videos added to the package.
- Preview: http://127.0.0.1:5173/.

## Shared pixel treatment (2026-09-08)

Extended 360px soft reconstruction, 192×384 texture sampling and 30% ordered dithering to every library-rendered preset and animation. This covers catalog previews, detail modals, full-screen transitions and the development animation verifier. The two iron presets retain their existing lights and material colors/roughness; yellow-wood lighting, brass tint and stile edge sampling remain specific to A02. Procedural and imported handles share the pixel shader. No motion timing, sound or public API changes in this extension.

Final brightness tuning lifts material midtones using `c + 0.45*c*(1-c)` before dithering, preserving black/white endpoints. Final verification: 34 core, 14 package and 11 browser tests passed; lint has three existing warnings and build retains its existing chunk-size warning. Preview screenshot: `docs/screenshots/2026-09-08-retro-door.png`.
