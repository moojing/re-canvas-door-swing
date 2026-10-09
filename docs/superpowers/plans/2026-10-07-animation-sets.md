# Explicit compatible animation sets implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkboxes. Plan review is required before code changes; the user already authorized execution after a successful review.

**Goal:** A complete preset selects an exact reusable animation set compatible with its motion and era; different paths within one era can coexist.

**Architecture:** Keep era metadata and preset IDs stable. Add optional `animationSet` to preset metadata and a registry/resolver that checks era/motion; explicit sets take precedence and invalid sets never fall back. Store reusable profile tracks separately from metadata and expose only resolved set metadata for detail display. Preserve style-only and unstyled legacy behavior, the mount API, random filters and temporary preview editing.

**Tech Stack:** TypeScript, Three.js vanilla library, React/Vite sample, node:test and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-animation-sets-design.md`.
**Workspace:** existing isolated `.worktrees/era-animation-style`, branch `codex/era-animation-style`. Preserve all earlier uncommitted work; do not merge, publish, auto-close #58 or bulk-commit unrelated changes.

## Source decisions and limits

Reinspect the existing ignored gallery contact sheets before implementing:
`materials/frame-extracts/1996-a01-camera-2026-10-06/contact-sheet.jpg`,
`1996-a01-toward-2026-10-06/contact-sheet.jpg`, and
`yellow-traversal-2026-10-06/contact-sheet.jpg`.
Original sources are `materials/door-transitions/1-1/a01/a01-s1鐵門.mp4`
and `1-1/a02/a02-s5黃目字門.mp4` in sibling gallery, not package assets.

Observed Iron first transition retains broad face at fade; second narrows toward
edge late. Yellow first/second both retain broad face. This supports sharing a
micro-open-advance behavior for Iron Enter and Yellow Enter/Leave, and a distinct
wide-swing-advance set for Iron Leave. Different exact original durations and
proportions are acknowledged; no per-preset calibration values will be added.
Blue/1998/1999 profiles are migrated unchanged, not claimed newly source-calibrated.
No gallery evaluation records change, so gallery:check is unnecessary here.

## File boundaries

- `core/types.ts`: `DoorAnimationSetId` and optional preset `animationSet`.
- `core/animationStyles.ts`: existing track builders and profiles; expose motion/style defaults and reusable wide-swing profile, remove selection by preset here.
- New `core/animationSets.ts`: metadata registry, explicit/fallback selection and compatibility; export metadata getter and internal profile resolver.
- `core/presetAnimation.ts`: resolve a set before retiming/validation; retain legacy animation path only when both style and set are absent.
- `core/presets.ts`: explicit IDs on all seven released presets.
- `src/index.ts`: export set ID type and read-only metadata getter, not profile mixing options.
- `sample/src/pages/AnimationPreviewWorkbench.tsx`: resolved Animation set ID row.
- Tests: new `core/__tests__/animation-sets.test.ts`, existing `preset-animation.test.ts`, `tests/browser/preset-catalog.test.ts`, `vanilla-smoke.test.ts`, package boundary checks.
- Docs: AGENTS.md, README pair, `docs/animation-style-1996.md`, calibration record.

## Task 1 — tests defining explicit sets

- [x] Add failing tests for every registered preset's assignment, same-set identity of motion/camera/fade/sound, cross-set difference, and optional handle presence.
- [x] Replace the previous “all 1996 single presets identical” assertion with grouping by `animationSet`; Iron Leave must differ while Yellow Enter/Leave and Iron Enter share exact tracks.
- [x] Test compatibility matrix through public config resolver: unknown ID via runtime cast, single set on double, matching motion but mismatched era, explicit set without style, and ID change with same set. All invalid explicit choices throw descriptive errors, never fallback.
- [x] Test style-only fallback by removing only animationSet; Iron Leave then uses current 1996 single default, not a hidden ID-specific choice. Remove BOTH set and style for legacy behavior; preview timing still throws for unstyled legacy.
- [x] Run `npm run test:lib:core`; expect red before implementation.

## Task 2 — set registry and resolution

- [x] Define IDs and assignment:
  - Iron Enter + Yellow Enter/Leave: `1996-single-micro-open-advance`.
  - Iron Leave: `1996-single-wide-swing-advance`.
  - Blue double: `1996-double-micro-open-hold-advance`.
  - 1998: `1998-single-micro-open-hold-advance`.
  - 1999: `1999-single-closed-wait-advance`.
- [x] Metadata shape: `{ id: DoorAnimationSetId, label: string, animationStyle: DoorAnimationStyleId, motion: DoorEntranceMotion }`. Registry entries also own internal `profile: EraAnimationProfile`; do not export tracks as mount choices.
- [x] Export `getDoorEntranceAnimationSet(preset): metadata | undefined`. If neither style nor set, return undefined. If explicit set, require existing registry entry, matching style and motion; otherwise throw. If style-only, find the existing motion/era default. Missing combinations throw.
- [x] Internal profile resolver uses that same selection and checks leaf track shape. For profiles with handle-start, handle-less presets omit the marker and zero the handle track; camera/door/fade/sound remain identical.
- [x] Use current 4800 ms micro profile unchanged. Restore prior Iron Leave fit as reusable wide profile: duration4700; angles0@3350,3°@3550,6°@3650,17°@3950,30°@4150,40°@4250,42°@4350,48°@4450,65°@4550,72°@4700; fade4580–4700; sound3350–4560/source.06–.36; camera z9@0 ease-out→6.1@1350→6.02@3350→5.98@3550→5.8@3650→5.4@3950→5.1@4150→4.9@4350→4.6@4450→4.3@4550→4.2@4700; target y.2@0→.4@1350/end. Events start,approach-end,opening-start,slight-open,opening-resumes,open-end4500,passage4560,fade-start,end. No handle motion.
- [x] Wire presetAnimation to explicit/fallback resolver before legacy branch; preserve retiming of profiles and unknown-marker checks.
- [x] Run `npm run test:lib:core`, `npm run test:lib:package`; expect pass including React-free exported package boundary.

## Task 3 — detail display and switching

- [x] Add failing browser assertions that detail displays set ID and Iron Enter→Leave changes it; Yellow variants keep the same set while actual preset IDs still change. No customer-facing set picker or arbitrary mix controls.
- [x] Add resolved set row, legacy text when no resolved set; keep era row separately. Style-only callers display resolved default.
- [x] Update traversal calibration reset expectation: Iron Leave slight-open3550, Enter3300. Yellow common handle seek stays54.2. Existing Iron Enter sound expectations remain2600–4500.
- [x] Run focused browser selection/retiming/seek/sound checks using `DOOR_TEST_URL=http://127.0.0.1:5176 npm run test:browser --workspace retro-horror-door -- --grep 'traversal|Enter/Leave|yellow door groups|styled sound|switching presets'`.

## Task 4 — docs, review and verification

- [x] Replace current motion/era-only rule in AGENTS/style docs: same SET means identical settings; era/motion compatibility is enforced but not enough to select among paths. Registered presets explicitly select sets; fallback only for older style-only callers.
- [x] Document exact mapping, source classification, wide-profile reuse and lack of per-door overrides. Preserve historical calibration entries and mark latest section as current; keep #58 outstanding.
- [x] Run `npm run lint`, `npm run build`, full `DOOR_TEST_URL=http://127.0.0.1:5176 npm run test:lib:browser` and `git diff --check`. Original 3 React refresh warnings may remain; inspect failures before targeted rerun.
- [x] Confirm local server running. Use T3 preview_status/navigation to visually sample closed, micro-open and late/fade for Iron Enter/Leave and Yellow Enter/Leave, compare behavior class to original contact sheets, save UI screenshot with resolved set row. No source grabs copied into package.
- [x] Request final focused code review; fix material issues and rerun affected checks. Report evidence and visual fit limits, link local sample and plan. PR #60 stays linked/open; no merge/push required by this request.

## Plan review

2026-10-07: independent reviewer approved with no blocking gaps. Incorporate:
normalized angle values; compare full internal tracks including easing and source
sound crop; freeze exported primitive-only metadata; regression samples for
unchanged Blue/1998/1999; wide-set timing edit/reset and obsolete marker rejection.

## Execution result

Completed in the existing worktree after plan approval. Regression red runs
confirmed missing set resolution and missing detail display. Final verification:
65 core + 2 assets, 16 package checks, 36 browser cases; lint/build pass with
original warnings. Original contact sheets rechecked and rendered closed/micro/late
samples saved. Library review: no material issues. All earlier work is preserved;
changes remain local/uncommitted, PR #60 is linked and open, #58 stays open.
