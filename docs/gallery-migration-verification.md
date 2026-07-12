# Gallery Migration Verification

- date: 2026-07-12
- status: complete
- canonical source: `/Users/mujingtsai/Case/BioHazard/re-canvas-door-swing/materials/1 開門動畫轉場製作`
- mirror source: `/Users/mujingtsai/Case/BioHazard/re-canvas-door-swing/materials/Organized/1 開門動畫轉場製作`
- destination: `/Users/mujingtsai/Case/BioHazard/re-door-gallery/materials/door-transitions`
- manifest entries: 318
- unique SHA-256 values: 318
- canonical MP4 count: 0
- mirror MP4 count: 0
- destination MP4 count: 318
- canonical PNG count: 12332
- mirror PNG count: 12332

## Local Gallery Cleanup

- status: complete
- inventoried files: 227
- byte-identical counterparts: 226
- explained stale files: doors.json

## Final Checks

- unit tests: 14 passed
- gallery consistency: 113 doors, 113 stills, 113 GIFs, 318 videos, 12,332 frames
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

- canonical PNG count after migration: 0
- mirror PNG count after migration: 0
- destination PNG count: 12332
