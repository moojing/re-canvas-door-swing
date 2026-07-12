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
- local-only source videos under `source-videos/`

The main README and agent instruction files will link to `https://github.com/moojing/re-door-gallery`, document the conventional local sibling path, and require a gallery consistency check whenever evaluation records change.

## Video Layout

The gallery stores one local-only copy using ASCII directory names:

```text
re-door-gallery/
  source-videos/
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

`re-door-gallery/.gitignore` will ignore `/source-videos/`. A consistency check will also fail if Git tracks any common video extension, providing protection in addition to ignore rules. The main repository continues to ignore `/materials/`.

## Deduplication And Manifest

The canonical source is exactly `materials/1 開門動畫轉場製作`; its mirror is exactly `materials/Organized/1 開門動畫轉場製作`. Migration computes SHA-256 for every MP4 in the canonical source and writes a tracked inventory to `docs/gallery-video-manifest.json`. The inventory records the ASCII destination-relative path, byte size, and SHA-256 without embedding local absolute paths. A local copy may also be written under the ignored `source-videos/` directory for operational convenience.

Files with the same SHA-256 use one canonical destination. Additional logical references point to that destination in the manifest instead of creating another copy. The current canonical source contains 318 files with no equal file sizes, so the expected result is 318 unique destination files.

The `materials/Organized/1 開門動畫轉場製作` tree is treated as a mirror. Before removal, every MP4 in both source trees must match by relative path, byte size, and SHA-256.

Both source trees also contain 12,332 PNG frame extracts and `.DS_Store` files. Those non-video files are outside this migration and must remain untouched. The migration removes only the 318 verified MP4 files from each tree, never either complete directory tree.

## Migration Safety

Migration is staged and verified in this order:

1. Inventory both exact source paths and fail if either contains symlinks or non-regular MP4 entries.
2. Create destination files with exclusive, collision-safe creation under the ignored ASCII directory structure.
3. Copy the canonical 318 source videos while computing the tracked manifest.
4. Verify source and destination counts, byte sizes, and SHA-256 values.
5. Verify there are no duplicate destination hashes or destination-path collisions.
6. Verify the `Organized` mirror MP4s match the canonical source MP4s by relative path and SHA-256.
7. Verify neither repository tracks video files and the gallery ignore rule covers the destination.
8. Remove only the 318 verified MP4 files from each main-project source tree after every check passes; leave all PNG frames, `.DS_Store` files, and directories untouched.
9. Remove the ignored `docs/door-gallery/` duplicate after confirming the tracked gallery has 113 stills, 113 GIFs, valid JSON, and matching evaluation data.

If any check fails, no source MP4 is removed. The copied destination can remain for inspection or be retried safely because manifest hashes make the operation idempotent.

## Tooling Changes

The gallery builder will read videos from the sibling gallery `source-videos/door-transitions` location and write generated outputs directly to the gallery checkout. Paths will be configurable through environment variables with a sibling-repository default, so Codex worktrees and nonstandard checkouts can override them.

A tracked consistency checker in the main project will verify:

- all 113 classification rows and relevant fields match `re-door-gallery/doors.json`;
- all current notes appear in `re-door-gallery/index.html`;
- the three published evaluation documents match the main source files;
- still and GIF counts are 113 each;
- no video files are tracked by either repository;
- local source videos, when present, contain no duplicate SHA-256 values and match their manifest.

The check should report a clear skip for local-only video validation when the sibling repository or source videos are absent, while still linking to the canonical GitHub repository.

## Documentation

The main README will include a short "Evaluation gallery" section with the GitHub URL, local sibling convention, source/output ownership, and check command. `AGENTS.md` and `CLAUDE.md` will point agents to the same workflow and state that evaluation edits are incomplete until the gallery consistency check passes.

The gallery README will state that source videos are local-only, explain the ASCII layout, and warn that video files must remain untracked. Existing GitHub Release archives remain the remote distribution mechanism; this migration does not upload or commit video files.

## Verification

Completion requires fresh evidence for:

- 318 unique destination MP4 files;
- source-to-destination SHA-256 equality;
- canonical-to-`Organized` MP4 SHA-256 equality before source removal;
- all 24,664 PNG frame files across the two source trees remain present after MP4 removal;
- no tracked video files in either repository;
- 113 matching door records, 113 stills, and 113 GIFs;
- clean JSON parsing and gallery consistency checks;
- Git diffs containing no binary video additions.
