# Gallery Asset Ownership Design

## Goal

Make `moojing/re-door-gallery` discoverable from the main project, remove local duplicate gallery outputs, and relocate the 318 door-transition source videos without allowing video files into either Git repository.

## Ownership

The main `re-canvas-door-swing` repository remains the source of truth for the in-progress evaluation:

- `docs/Doors-Difficulity-Estimation.xlsm.csv`
- `docs/door-classifications.md`
- `docs/door-classification-report.md`
- gallery generation and consistency-check tooling

The sibling `re-door-gallery` repository is the published snapshot:

- `index.html`
- `doors.json`
- `docs/` copies of the evaluation documents
- `stills/` and `gifs/`
- local-only source videos under `materials/`

The main README and agent instruction files will link to `https://github.com/moojing/re-door-gallery`, document the conventional local sibling path, and require a gallery consistency check whenever evaluation records change.

## Video Layout

The gallery stores one local-only copy using ASCII directory names:

```text
re-door-gallery/
  materials/
    door-transitions/
      1-1/
        a01/
        ...
      1-2/
      1-3/
      1-4/
      1-5/
```

Existing door-code prefixes determine the destination directory. Human-readable Chinese names remain in the evaluation data rather than directory names. Original video filenames may be retained because the ASCII-only requirement applies to directories.

`re-door-gallery/.gitignore` will ignore `/materials/`. A consistency check will also fail if Git tracks any common video extension, providing protection in addition to ignore rules. The main repository continues to ignore `/materials/`.

## Deduplication And Manifest

The canonical source is exactly `materials/1 開門動畫轉場製作`; its mirror is exactly `materials/Organized/1 開門動畫轉場製作`. Migration computes SHA-256 for every MP4 in the canonical source and writes a tracked inventory to `docs/gallery-video-manifest.json`. The inventory records the ASCII destination-relative path, byte size, and SHA-256 without embedding local absolute paths. A local copy may also be written under the ignored gallery `materials/` directory for operational convenience.

Files with the same SHA-256 use one canonical destination. Additional logical references point to that destination in the manifest instead of creating another copy. The current canonical source contains 318 files with no equal file sizes, so the expected result is 318 unique destination files.

The `materials/Organized/1 開門動畫轉場製作` tree is treated as a mirror. Before removal, every MP4 and PNG in both source trees must match by relative path, byte size, and SHA-256.

Each source tree also contains 12,332 PNG frame extracts. Frame migration preserves all 12,332 logical paths under the gallery's ignored `materials/frame-extracts/` tree, including 1,350 repeated animation holds, while recording 10,982 unique hashes. After source/mirror/destination verification, the migration removes only the individually revalidated MP4 and PNG files; `.DS_Store` files and directories remain untouched.

## Migration Safety

Migration is staged and verified in this order:

1. Inventory both exact source paths and fail if either contains symlinks or non-regular MP4/PNG entries.
2. Create destination files with exclusive, collision-safe creation under the ignored ASCII directory structure.
3. Copy the canonical 318 source videos while computing the tracked manifest.
4. Verify source and destination counts, byte sizes, and SHA-256 values.
5. Verify there are no duplicate destination hashes or destination-path collisions.
6. Verify the `Organized` mirror MP4s match the canonical source MP4s by relative path and SHA-256.
7. Copy all 12,332 logical PNG paths to collision-free ASCII `frame-extracts/<game>/<door-code>/set-NNN/` destinations and verify source/mirror/destination hashes.
8. Verify neither repository tracks material files and the gallery ignore rule covers both destinations.
9. Remove only the individually revalidated 318 MP4 and 12,332 PNG files from each main-project source tree; leave `.DS_Store` files and directories untouched.
10. Inventory every file under the ignored `docs/door-gallery/`, map `door-gallery.html` to the gallery's `index.html`, and compare content hashes against the tracked gallery. Remove the local tree only when every file has a counterpart and is either byte-identical or an explicitly documented stale generated file whose gallery counterpart matches the current source evaluation documents. Any missing, unique, or unexplained mismatch stops deletion.

Before deletion, each migration atomically writes and re-reads a `ready-to-delete` manifest containing source-relative paths and expected hashes. It then resolves both Git worktrees, requires `/materials/` ignore coverage and zero tracked material files in each, and records those boundary checks in the pre-deletion report. If canonical deletion, mirror deletion, or the final report write fails, a rerun validates the destination and every still-present source file, treats already-absent validated entries as completed, and resumes. The manifest changes to `complete` only after deletion and final evidence succeed. If any pre-deletion check fails, no source asset is removed.

## Tooling Changes

The gallery builder will read videos from the sibling gallery `materials/door-transitions` location and write generated outputs directly to the gallery checkout. Paths will be configurable through environment variables with a sibling-repository default, so Codex worktrees and nonstandard checkouts can override them.

A tracked consistency checker in the main project will verify:

- all 113 classification rows and relevant fields match `re-door-gallery/doors.json`;
- all current notes appear in `re-door-gallery/index.html`;
- the three published evaluation documents match the main source files;
- still and GIF counts are 113 each;
- `git ls-files -- materials` returns no tracked material files in either repository, and `/materials/` ignore coverage exists in both;
- when their local roots are present, videos and frame extracts match every manifest path and hash, including exactly 318 videos, 12,332 frames, 10,982 unique frame hashes, and 1,350 repeated logical frames.

The check should report a clear skip for local-only asset validation when the sibling repository or materials are absent, while still linking to the canonical GitHub repository.

The migration must also write `docs/gallery-migration-verification.md` as a tracked completion record. It will include the execution date, repository-relative source and destination paths, pre- and post-migration MP4/PNG counts, both manifest entry and unique-hash counts, source/mirror/destination SHA-256 verification results, the full `docs/door-gallery/` inventory comparison and any explained stale-output mismatch, gallery record/still/GIF/video/frame counts, Git tracked-material checks for both repositories, and `git diff --stat` confirmation that no material binaries were added. The report records command results and exit status summaries without transient absolute paths.

## Documentation

The main README will include a short "Evaluation gallery" section with the GitHub URL, local sibling convention, source/output ownership, and check command. `AGENTS.md` and `CLAUDE.md` will point agents to the same workflow and state that evaluation edits are incomplete until the gallery consistency check passes.

The gallery README will state that source videos are local-only, explain the ASCII layout, and warn that video files must remain untracked. Existing GitHub Release archives remain the remote distribution mechanism; this migration does not upload or commit video files.

## Verification

Completion requires fresh evidence for:

- 318 unique destination MP4 files;
- source-to-destination SHA-256 equality;
- canonical-to-`Organized` MP4 SHA-256 equality before source removal;
- 12,332 destination PNG frame paths and zero source/mirror PNG files after verified frame migration;
- 10,982 unique frame hashes with 1,350 repeated logical frames preserved;
- no tracked material files in either repository;
- 113 matching door records, 113 stills, 113 GIFs, 318 videos, and 12,332 frames;
- clean JSON parsing and gallery consistency checks;
- Git diffs containing no material binary additions.

All completion evidence above must be recorded in the tracked `docs/gallery-migration-verification.md`; the migration is not complete if the report is absent or contains a failed check.
