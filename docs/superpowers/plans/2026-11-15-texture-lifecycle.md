# Door surface texture lifecycle implementation plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans. Implementation authorized by the user on2026-11-16; local work is isolated on `fix/surface-texture-lifecycle`.

**Goal:** Reusing a mounted door entrance across link transitions must not accumulate abandoned surface textures or apply/render expired load completions.

**Architecture:** Introduce an internal surface-texture batch owner per door rebuild. Each batch owns only the texture objects loaded for that door's front/edge/back materials. Rebuild and unmount close the batch; callbacks from closed batches dispose their result without assigning materials or rendering. Preserve the public API, authored animation, shader configuration and existing loading/error fallback behavior.

**Tech Stack:** TypeScript, Three.js r133, node:test, Playwright, npm workspaces.

## Evidence and scope

At main853d8c1, a real renderer with three handle-free presets showed texture counts3/33/63/93 after0/10/20/30 switches; geometry stayed3. Explicit Texture.dispose/deleteTexture calls stayed0. Three real-time complete plays showed3/6/9 textures. Deferred old callbacks did not replace current maps, but did not dispose their results. Unmount-before-completion already disposed all three late textures. Local audit: `materials/texture-lifecycle-audit/` (ignored).

This is evidence of missing explicit disposal and growing renderer accounting, not a measurement of driver-memory bytes or a crash threshold. Do not describe the fix as repairing an observed wrong-texture display.

## Approach selection

Recommended: per-rebuild ownership and invalidation. It fixes the measured issue without introducing a persistent cache or changing loading behavior.

Alternative: a shared URL cache with reference counting and eviction. Defer it: this introduces cache keys, flip/filter compatibility, multi-instance references, pending-consumer cancellation and eviction policy without being necessary for this fix.

Do not implement a generic traversal that disposes every material.map. `handleModel.ts` deliberately shares `procedural-aged-handle` through a module singleton, and imported GLTF scene data is cached. Their resource ownership is separate. Do not dispose handle textures or cached imported geometry as part of surface cleanup. Auditing the handle cache's own lifecycle is separate work.

## Invariants

- Every rebuild has a distinct batch object; object identity is the generation token, including A→B→A with identical URLs.
- A batch has active/closed state and a Set of successfully accepted surface textures. One texture used by several materials is disposed once, after the entire batch becomes unused.
- No cross-batch sharing or URL deduplication is added in this change. Keep the existing three surface loads, flipY, wrap/filter/mipmap settings and material assignment order.
- Closing is idempotent. First invalidate callbacks, detach the old door from rendering, clear maps owned by that batch, then dispose owned textures and clear tracking. Only then finish existing geometry/material cleanup. On unmount, release textures before renderer.dispose.
- A callback from a closed batch disposes the newly completed texture exactly once and returns before configuring, assigning materials or rendering. Closing a batch must not pre-dispose pending texture objects that will later be disposed again by completion.
- Failed loads retain the existing untextured fallback; handle load errors explicitly enough to drop pending bookkeeping without unhandled rejections, stale rendering, new public callbacks or retries.
- Replaying/seeking/resetting the same preset without a rebuild does not start a new batch or reload textures.
- Separate mounted entrances have separate surface ownership; releasing one must not affect the other.

## Task 1: Characterize the failures

Files: create `packages/door-lib/tests/browser/texture-lifecycle.test.ts`.

- [x] Convert the local audit into focused Playwright tests using the actual Three.js module, TextureLoader callbacks, texture dispose events and Mesh.onBeforeRender renderer access. Do not retain retired materials/textures/WebGL handles in stress counters; use weak references or primitive IDs where needed.
- [x] Test30 alternating preset resets/seeks on one instance. Wait for every batch's actual image decode/upload; current renderer texture count must remain bounded by current surfaces, rather than3+3×switches. Check explicit disposal, not renderer counters alone.
- [x] Hold batchA's real decoded completions, switch toB, completeB, then releaseA. Require A results disposed, no assignment to retired materials, no stale render triggered, and B maps unchanged. Also cover A→B→A so URL equality cannot substitute for generation identity.
- [x] Cover loaded-unmount and pending-unmount, repeated cleanup, a failed load followed by a valid switch, same-preset replay, and two simultaneous mounted instances.
- [x] Cover a partially completed batch: one surface accepted/uploaded and two callbacks held. Rebuild and unmount variants must dispose the accepted texture during close, then dispose each held result exactly once upon release.
- [x] Run on isolated ports and confirm the accumulation/stale-result cases fail on the current implementation for the expected reason. Existing pending-unmount and same-preset controls should pass.

Run: `DOOR_TEST_URL=http://127.0.0.1:5473 DOOR_CALIBRATION_TEST_URL=http://127.0.0.1:5477 DOOR_PRODUCTION_TEST_URL=http://127.0.0.1:4476 npx playwright test --config packages/door-lib/tests/browser/playwright.config.ts texture-lifecycle.test.ts --workers=1`.

## Task 2: Implement batch ownership

Files: create `packages/door-lib/src/renderer/surfaceTextureBatch.ts`; modify `packages/door-lib/src/renderer/scene.ts`.

- [x] Put batch active/closed state, accepted texture ownership, guarded completion and idempotent release in the internal helper. Keep the helper internal; no index export or public API changes.
- [x] Pass the existing TextureLoader and current renderer's render callback to the helper. Preserve all current texture configuration. Register ownership before assigning a successfully accepted result.
- [x] Begin/close a batch at the rebuild boundary, not at every animation frame, seek or Play. Replace direct loadTexture logic with batch-guarded loads for front/edge/back.
- [x] Route rebuild and scene.dispose through the same surface-release path. Invalidate before disposing; keep camera invalidation and existing playback/audio behavior unchanged.
- [x] Keep material/geometry cleanup as scoped as possible. Do not expand into handle-cache eviction, generic reference counting or unrelated duplicate-dispose cleanup.
- [x] Run the new tests: all cases pass; verify rejected batches cannot trigger rendering and current batch renders normally.

## Task 3: Validate visuals and real usage

- [x] Run `npm run lint`, `npm run build`, `npm run test:lib:core`, `npm run test:lib:package`.
- [x] Run `DOOR_TEST_URL=http://127.0.0.1:5473 DOOR_CALIBRATION_TEST_URL=http://127.0.0.1:5477 DOOR_PRODUCTION_TEST_URL=http://127.0.0.1:4476 npm run test:lib:browser` (includes frozen visual checks). Use the recorded macOS arm64 visual environment; do not refresh baselines to make tests pass.
- [x] Extend steady-state testing to100 switches, including handle-free and knob presets. Shared handle texture allowance must be explicitly bounded and independent of switch count; do not incorrectly demand zero while an active handle uses it.
- [x] Play several different presets to completion on one transition instance, then repeat mount/unmount and play on a new instance. Check final texture count/allocation balance rather than waiting for visible stutter.
- [x] Inspect the local sample's front/back/edge appearance, handle material, Enter/Leave, device comparison, Play/Reset/seek and fullscreen transition. Compare generated public declarations with the pre-change versions.
- [x] Update `docs/design/renderer-boundaries.md` with the surface ownership rule and separate shared-handle ownership. Record actual test results and limits. No preset/source completion counts change.
- [x] Request independent review of ownership, stale completions, duplicate disposal, cross-instance interference and test instrumentation retention before delivery.

## Acceptance

On one active handle-free door, repeated switches return to the current three surface textures after each settled load. After explicit unmount, previously accepted surface textures have each been disposed once. After releasing stale or post-unmount callbacks, no abandoned loaded surface texture remains undisposed. Shared handles and other live entrances remain intact. Existing numeric/visual regressions and public APIs are unchanged. No claim of GPU byte usage, GC behavior or source-video fidelity is inferred from these tests.

## Delivery boundary

Implementation uses `.worktrees/texture-lifecycle`. Push/PR/merge/publication remain separate from the authorized local implementation and validation.

Plan review: independently reviewed against scene.ts and handleModel.ts; approved with no blocking findings. Added the suggested explicit partially-completed-batch case.


## Implementation and verification — 2026-11-16

Implemented locally in `fix/surface-texture-lifecycle`, based on853d8c1.
`SurfaceTextureBatch` owns only accepted front/edge/back textures and drops
pending material references when closed. Both rebuild and unmount close the old
batch before geometry/material/renderer teardown. No cache, API, shader,
animation data, preset, asset or frozen baseline changes.

Test-first evidence: stationary (autoPlay:false) old-code tests reproduced
18additional mesh draws on each expired A→B/A→B→A completion batch; the pending
unmount control passed. The30-switch test failed immediately at6textures versus
expected3, and loaded-instance cleanup failed for absent disposal.

Validation:

- lint, build: passed; three existing Fast Refresh warnings and the existing sample chunk-size warning remain.
- core:145 behavior +2local-assets +4frozen numeric/assets tests passed.
- package:16passed. Generated index.d.ts and vanilla.d.ts are byte-identical to pre-change declarations.
- focused new lifecycle suite:13passed. Includes30handle-free switches,100mixed switches, A→B/A→B→A, six pending/partial/loaded rebuild/unmount cases, two live instances, failure/recovery, same-preset reuse, full plays and remount.
- full isolated functional browser suite:98passed (including the13new cases); frozen visual/assets suite:43passed. Ports5473/5477/4476 and visual5692 ensure these tests used this checkout.
- The final test-only improvement waits for public onComplete instead of inspecting CSS fade; its focused rerun passed1/1 and an independent reviewer approved the delta. It verifies3completions on the first instance and1after remount.
- Independent specification and code-quality reviews approved the runtime and test ownership checks. Initial test review findings were addressed by asserting actual current surface IDs/uploads and each instance's specific disposal IDs, including all three shared handle maps.

Independent collaborative-browser audit used the same counter-only script as
the old-code audit and did not retain retired resources:

| Settled switches | Before: renderer textures | After: renderer textures | After: surface disposals / explicit GL deletes |
| --- | ---: | ---: | ---: |
| 0 | 3 | 3 | 0 / 0 |
| 10 | 33 | 3 | 30 / 30 |
| 20 | 63 | 3 | 60 / 60 |
| 30 | 93 | 3 | 90 / 90 |

Loaded unmount now reduces surface texture count3→0. All three stale decoded
results are disposed without changing the current texture IDs; pending-unmount
still disposes its three late results. Local ignored counter output is
`materials/texture-lifecycle-audit/results-fixed.json` in the main checkout.
Shared knob maps form a fixed allowance (procedural map, normal map and packed
roughness/metalness map); they are intentionally not freed by surface cleanup.
The100-switch test verifies all303surface textures disposed once, without
unbounded shared-map growth. These are resource-count/disposal measurements,
not driver-memory-byte, forced-GC or crash-threshold measurements.

Local sample: operated device comparison, slight-opening seek, Enter/Leave,
Leave playback to100% and Reset; inspected generated device comparison and
Leave passage screenshots. Historical portrait visual comparisons retain their
existing protected-phase scope. This does not certify source-video fidelity.

No new Phase1source completion or npm publication. No push, PR or merge in this
implementation step. The main runtime checkout is unchanged.

Runtime/tests committed as `b368ee0` (`fix: dispose retired door surface textures`).
