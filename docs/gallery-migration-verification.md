# Gallery Migration Verification

- date: 2026-07-12
- status: complete
- canonical source: `materials/1 開門動畫轉場製作`
- mirror source: `materials/Organized/1 開門動畫轉場製作`
- destination: `../re-door-gallery/materials/door-transitions`
- manifest entries: 318
- unique SHA-256 values: 318
- canonical/mirror SHA-256 verification: passed (318/318 files)
- canonical/destination SHA-256 verification: passed (318/318 files)
- canonical MP4 count: 0
- mirror MP4 count: 0
- destination MP4 count: 318
- canonical PNG count before frame migration: 12332
- mirror PNG count before frame migration: 12332
- canonical repository materials boundary: passed (ignored; 0 tracked files)
- gallery repository materials boundary: passed (ignored; 0 tracked files)

## Local Gallery Cleanup

- status: complete
- inventoried files: 227
- counterpart paths found: 227/227
- counterpart SHA-256 comparisons completed: 227/227
- byte-identical counterparts: 226
- explained stale files: doors.json
- gallery source-record validation: passed (113 records x 11 fields)
- stale doors.json justification: the gallery copy matches all 113 current source records; the removed local copy omitted the reviewed `1-5 c09` note prefix

## Final Checks

- unit tests: 26 passed
- gallery consistency: 113 doors x 11 fields, 113 stills, 113 GIFs, 318 videos, 12,332 frames
- gallery `/materials/` ignore rule: passed
- tracked videos in main repository: 0
- tracked videos in gallery repository: 0
- tracked frame extracts in gallery repository: 0
- destination directories containing non-ASCII characters: 0
- lint: passed with 3 existing Fast Refresh warnings
- production build: passed with existing dependency/chunk warnings
- `git diff --check`: passed

## Frame Migration

- status: complete
- manifest entries: 12332
- unique SHA-256 values: 10982
- duplicate logical frames preserved: 1350
- canonical/mirror SHA-256 verification: passed (12,332/12,332 files)
- canonical/destination SHA-256 verification: passed (12,332/12,332 files)
- canonical repository materials boundary: passed (ignored; 0 tracked files)
- gallery repository materials boundary: passed (ignored; 0 tracked files)

- canonical PNG count after migration: 0
- mirror PNG count after migration: 0
- destination PNG count: 12332
