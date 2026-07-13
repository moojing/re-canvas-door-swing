# Gallery Asset Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move 318 unique door-transition MP4s and 12,332 logical PNG frames into the ignored sibling gallery `materials/` tree, remove verified duplicate source copies and local gallery outputs from the main checkout, and make cross-repository ownership discoverable and testable.

**Architecture:** A focused Python tool owns path mapping, SHA-256 inventory generation, migration safety gates, and consistency checks. The main repository remains the evaluation source of truth; the sibling gallery remains the published snapshot and single local material owner. Migration copies first, atomically records a resumable `ready-to-delete` manifest, verifies source/mirror/destination, and then deletes only revalidated source files. Filesystem presence plus manifest hashes provide durable per-entry recovery until the final report and manifest are both recorded as `complete`.

**Tech Stack:** Python 3 standard library, Node/npm script entry point, Markdown documentation, Git ignore rules.

---

## Task 1: Gallery Asset Tool Tests

**Files:**
- Create: `scripts/tests/test_gallery_assets.py`
- Create: `scripts/gallery_assets.py`

- [ ] **Step 1: Write failing tests for ASCII path mapping**

Cover game folders such as `1-1 1996 Biohazard`, door folders such as `c05中庭電梯`, rejection of unmapped folders, and collision detection. Expected destination: `door-transitions/1-1/c05/<filename>.mp4`.

- [ ] **Step 2: Run mapping tests and verify RED**

Run: `python3 -m unittest scripts.tests.test_gallery_assets -v`

Expected: FAIL because `scripts.gallery_assets` does not yet expose the mapping functions.

- [ ] **Step 3: Implement minimal mapping and inventory functions**

Implement pure helpers for recursive MP4 discovery, ASCII destination mapping, SHA-256 streaming, manifest entries, duplicate-hash detection, and destination collision detection. Do not delete files in these helpers.

- [ ] **Step 4: Add failing migration-safety tests**

Use temporary directories to prove migration:

- refuses any symlink anywhere in either exact source tree, including symlinked directories, and refuses non-regular MP4 entries;
- rejects symlinks or non-regular entries anywhere in the destination tree and proves every resolved destination path remains contained under the gallery `materials/door-transitions` root;
- refuses source/mirror path, size, or hash mismatches;
- refuses destination collisions;
- writes files exclusively without overwriting unrelated content;
- removes only verified MP4 files after destination verification;
- preserves PNG and `.DS_Store` files;
- is safe to rerun after an interrupted or completed copy;
- accepts pre-existing destinations only when their hashes match;
- revalidates each source and mirror MP4 immediately before unlinking and leaves any late-added or replaced file untouched;
- resumes safely when canonical deletion succeeds but mirror deletion fails;
- resumes safely when all source deletions succeed but the final report write fails;
- aborts before deletion unless both repositories ignore `/materials/` and track no files below it;
- records only repository-relative source and destination paths in tracked evidence;
- rejects absolute, traversal, non-string, and malformed paths loaded from resumable manifests before any copy or unlink;
- fails closed when migration verification-report generation fails.

- [ ] **Step 5: Run safety tests and verify RED**

Run: `python3 -m unittest scripts.tests.test_gallery_assets -v`

Expected: FAIL on missing migration behavior.

- [ ] **Step 6: Implement migration and verification commands**

Add `migrate`, `migrate-frames`, `check`, and `clean-local-gallery` subcommands. Defaults resolve the sibling gallery from the main checkout, with `DOOR_GALLERY_ROOT` override. Both migration commands must copy and hash, atomically generate and re-read a `ready-to-delete` manifest containing source-relative paths, generate the pre-deletion report, revalidate every existing source file immediately before its individual unlink, then regenerate the final report and manifest as `complete`. If either unlink or final evidence write fails, rerunning uses the durable manifest plus existing/missing file state to resume safely. Destination path components must be regular directories within the contained destination root, never symlinks. `clean-local-gallery` must re-inventory and hash every file immediately before deletion, validate all counterpart mappings, permit only a documented stale `doors.json` whose gallery replacement matches current source data, update and validate the tracked verification report, then unlink only the exact validated files and remove only empty directories. `check` must never mutate files.

- [ ] **Step 7: Run tests and verify GREEN**

Run: `python3 -m unittest scripts.tests.test_gallery_assets -v`

Expected: all tests PASS.

## Task 2: Gallery Consistency Checks

**Files:**
- Modify: `scripts/tests/test_gallery_assets.py`
- Modify: `scripts/gallery_assets.py`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for document and gallery consistency**

Test 113-row field comparison, document-copy equality, HTML note presence, still/GIF counts, exact 318-video and 12,332-frame manifest totals, 10,982 unique frame hashes, 1,350 repeated logical frames, `/materials/` ignore coverage, and failure when either repository tracks any material file. Also prove that an absent local-only material root is reported as skipped while tracked manifest schema and inventory metadata remain mandatory.

- [ ] **Step 2: Run consistency tests and verify RED**

Run: `python3 -m unittest scripts.tests.test_gallery_assets -v`

Expected: FAIL on missing consistency checks.

- [ ] **Step 3: Implement read-only consistency checks**

Parse Markdown rows and `doors.json`, normalize verdict spacing, compare the 11 source fields, inspect `index.html`, count assets, invoke read-only Git queries, and validate exact manifest path/hash and inventory totals when the corresponding local material root exists. Missing local-only video or frame roots must produce explicit SKIP messages where permitted.

- [ ] **Step 4: Add npm entry point**

Add `gallery:check` as `python3 scripts/gallery_assets.py check`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `python3 -m unittest scripts.tests.test_gallery_assets -v`

Expected: all tests PASS.

## Task 3: Builder And Documentation Ownership

**Files:**
- Modify: `.claude/skills/check-door/scripts/build_gallery.py`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `../re-door-gallery/README.md`
- Create: `../re-door-gallery/.gitignore`

- [ ] **Step 1: Update builder path configuration**

Default input to sibling `re-door-gallery/materials/door-transitions`; default generated output to the sibling gallery root. Support `DOOR_GALLERY_ROOT`, `DOOR_VIDEO_ROOT`, and output overrides so worktrees and other checkout layouts remain usable.

- [ ] **Step 2: Add main-project discovery documentation**

Link `https://github.com/moojing/re-door-gallery`, document the sibling convention, source/published ownership, `npm run gallery:check`, and the rule that evaluation changes are incomplete until gallery consistency passes.

- [ ] **Step 3: Protect gallery materials**

Create gallery `.gitignore` with `/materials/`. Document `materials/door-transitions/1-1/c05/` layout and state that video files must never be committed.

- [ ] **Step 4: Verify documentation and path references**

Run: `rg -n "re-door-gallery|gallery:check|materials/door-transitions" README.md AGENTS.md CLAUDE.md .claude/skills/check-door/scripts/build_gallery.py ../re-door-gallery/README.md`

Expected: each agent entry point and builder references the canonical gallery workflow.

## Task 4: Real Video Migration

**Files:**
- Create: `docs/gallery-video-manifest.json`
- Create: `docs/gallery-migration-verification.md`
- Create ignored: `../re-door-gallery/materials/door-transitions/**`
- Remove ignored MP4 only: `materials/1 開門動畫轉場製作/**/*.mp4`
- Remove ignored MP4 only: `materials/Organized/1 開門動畫轉場製作/**/*.mp4`

- [ ] **Step 1: Capture pre-migration inventory**

Record 318 MP4s and 12,332 PNGs in each source tree, no symlinks, no destination mapping collisions, and no tracked files under either repository's `materials/` directory. Verify both repositories ignore `/materials/`.

- [ ] **Step 2: Run migration copy and SHA-256 verification**

Run: `python3 scripts/gallery_assets.py migrate`

Expected before deletion: 318 canonical entries, 318 unique hashes, source/mirror/destination hash equality, both repositories' `/materials/` trees ignored and untracked, all destination paths contained and free of symlinks/non-regular entries, and a valid tracked pre-deletion report written successfully with repository-relative paths only.

- [ ] **Step 3: Remove only verified source MP4s**

The migration command re-hashes each canonical and mirror MP4 immediately before individually unlinking it. It removes the 318 canonical and 318 mirror MP4s only when the late hash still matches the manifest, leaves any changed/new file untouched and reports failure, and preserves 12,332 PNGs in each tree.

- [ ] **Step 4: Verify post-migration state**

Run: `python3 scripts/gallery_assets.py check`

Expected: 318 destination MP4s, zero source/mirror MP4s, 12,332 PNGs per source tree, unique manifest hashes, no tracked videos, and a regenerated valid final report containing the actual post-deletion counts.

## Task 5: Real Frame Migration

**Files:**
- Create: `docs/gallery-frame-manifest.json`
- Create ignored: `../re-door-gallery/materials/frame-extracts/**`
- Remove ignored PNG only: `materials/1 開門動畫轉場製作/**/*.png`
- Remove ignored PNG only: `materials/Organized/1 開門動畫轉場製作/**/*.png`

- [ ] **Step 1: Capture and compare frame inventories**

Require 12,332 source and 12,332 mirror PNG paths with matching byte sizes and SHA-256 values. Assign collision-free ASCII destinations as `<game>/<door-code>/set-NNN/frame_NNNN.png`.

- [ ] **Step 2: Copy and verify all logical frame paths**

Run: `python3 scripts/gallery_assets.py migrate-frames`

Expected before deletion: 12,332 destination files, 10,982 unique hashes, 1,350 repeated logical frames preserved, source/mirror/destination hash equality, and an atomically written `docs/gallery-frame-manifest.json` that passes an immediate exact-content re-read.

- [ ] **Step 3: Remove only revalidated source frames**

Treat the validated `ready-to-delete` frame manifest and both repositories' ignored/untracked `/materials/` boundaries as mandatory gates. Re-hash each existing source and mirror PNG immediately before unlinking. Leave any changed or newly added file untouched and fail the migration; a rerun resumes from source-relative manifest entries when one side is already absent.

- [ ] **Step 4: Verify post-migration state**

Run: `npm run gallery:check`

Expected: `gallery:check` requires a `complete` frame manifest, exactly 12,332 destination PNGs, and a per-path SHA-256 match for every manifest entry. It also requires zero canonical/mirror PNGs, ASCII-only destination directories, and no tracked files under either repository's `materials/` directory.

## Task 6: Duplicate Local Gallery Cleanup

**Files:**
- Remove ignored: `docs/door-gallery/`
- Update: `docs/gallery-migration-verification.md`

- [ ] **Step 1: Write and run failing cleanup tests**

Add temporary-directory tests proving `clean-local-gallery` aborts on a missing counterpart, changed file after a prior inventory, unexplained hash mismatch, invalid gallery data, symlink, report-generation failure, or invalid report content. Test a file added or replaced immediately before deletion and prove it is never removed. The command only removes the exact validated files when all 227 pass immediate fail-closed validation.

- [ ] **Step 2: Implement fail-closed cleanup in the asset tool**

The command must inventory and hash local outputs and gallery counterparts in one execution immediately before deletion. Map `door-gallery.html` to `index.html`, require every local file to have a counterpart, and allow the stale `doors.json` mismatch only when the gallery JSON matches all 113 current source records. It must update and validate `docs/gallery-migration-verification.md` before any unlink, then unlink each exact revalidated file individually and remove directories only when empty. Any newly added or replaced entry must remain and make cleanup incomplete rather than being recursively deleted.

- [ ] **Step 3: Run cleanup tests and verify GREEN**

Run: `python3 -m unittest scripts.tests.test_gallery_assets -v`

Expected: all cleanup safety tests PASS.

- [ ] **Step 4: Execute inventory and cleanup**

Map 227 local files to gallery counterparts, including `door-gallery.html` to `index.html`. Require every local file to have a counterpart.

- [ ] **Step 5: Verify the generated cleanup evidence**

Verify the command recorded that 226 files are byte-identical and the local `doors.json` is stale only because the gallery `doors.json` matches all 113 current source records. Report validation failure must prevent unlinking.

- [ ] **Step 6: Remove the ignored local output tree**

Run: `python3 scripts/gallery_assets.py clean-local-gallery`

Expected: the command revalidates immediately, writes valid tracked evidence, unlinks only the exact 227 validated files, and removes only empty directories. It must not recursively delete `docs/door-gallery/`.

- [ ] **Step 7: Run full verification**

Run:

```sh
python3 -m unittest scripts.tests.test_gallery_assets -v
npm run gallery:check
npm run lint
npm run build
git diff --check
```

Expected: tests, gallery check, lint, and build pass; no whitespace errors; neither repository has tracked or staged video files. Record fresh evidence in `docs/gallery-migration-verification.md`.
