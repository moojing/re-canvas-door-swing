# Gallery Single Source Of Truth Design

## Goal

Make `../re-door-gallery` the only source of truth for door-evaluation records so the main project can no longer drift from the published gallery.

## Scope

This change covers only the three tracked evaluation documents and the tooling that reads, verifies, or instructs people to edit them:

- `door-classifications.md`
- `door-classification-report.md`
- `Doors-Difficulity-Estimation.xlsm.csv`

It does not redesign the gallery data model, change video/frame ownership, or add a new shared storage layer.

## Target Ownership Model

After migration, the sibling `re-door-gallery` repository owns the canonical copies of:

- `docs/door-classifications.md`
- `docs/door-classification-report.md`
- `docs/Doors-Difficulity-Estimation.xlsm.csv`
- gallery outputs derived from those records (`doors.json`, `index.html`, stills, GIFs)

The main `re-canvas-door-swing` repository keeps:

- tooling that validates or generates gallery assets;
- documentation that explains the workflow;
- skills/scripts that operate on the gallery checkout;
- migration and verification records.

The main repository must stop tracking local duplicates of the three evaluation documents.

## Non-Goals

- No bidirectional sync.
- No fallback that silently reads stale local copies from the main repository.
- No third shared repository or package for evaluation data.
- No attempt to support editing evaluation data when `../re-door-gallery` is missing.

## Migration Strategy

The migration is a hard ownership flip, executed in this order:

1. Verify the sibling gallery checkout exists and already contains the current three evaluation files. If the checkout exists but any of the three files are missing or stale, the migration must first seed the gallery from the current main-repository copies exactly once, then verify hashes before ownership flips. This one-time seed is only to preserve the already-approved current state during the transition; after the flip, the main repository immediately loses authority. If the gallery checkout itself is missing, implementation stops with a setup error rather than creating a new checkout implicitly.
2. Update all main-project tooling so reads and writes target the gallery checkout directly.
3. Update workflow documentation and agent guidance to say gallery is the only editable location.
4. Add guardrails that fail if the main repository ever reintroduces tracked copies of the three evaluation files.
5. Delete the three tracked evaluation files from the main repository only after steps 2 through 4 are in place.

The deletion is part of the design, not optional cleanup. If the files remain in the main repository, ownership is still ambiguous.

## Tooling Changes

### Gallery Paths

All evaluation-aware tooling in the main repository must resolve the gallery checkout first, with:

- default root: `../re-door-gallery`
- optional override: existing `DOOR_GALLERY_ROOT` environment variable

If the resolved gallery root is missing, evaluation commands must fail with a direct message telling the user that the sibling gallery checkout is required.

### Consistency Check

`npm run gallery:check` must stop comparing "main docs vs gallery docs" because the main copies will no longer exist.

Instead, the check validates gallery-internal consistency:

- gallery `docs/door-classifications.md` and `doors.json` describe the same 113 door records;
- every rendered note in `index.html` matches the canonical gallery documents;
- still and GIF counts remain correct;
- local-only asset manifests still match when local materials are present;
- neither repository tracks forbidden material files;
- the main repository does not track any of the three canonical evaluation filenames.

### Skills And Scripts

Any script or skill that currently points users to `re-canvas-door-swing/docs/...` for evaluation edits must be changed to point to `../re-door-gallery/docs/...`.

For `check-door`, that means:

- read the gallery-owned classification files;
- write classification updates into the gallery repo;
- keep any progress bookkeeping in the location already intended by the skill, unless that bookkeeping is itself one of the three canonical docs.

## Guardrails

The main repository needs an explicit failure mode for ownership regression.

Guardrails should include:

- a check in `gallery_assets.py` that errors if `docs/door-classifications.md`, `docs/door-classification-report.md`, or `docs/Doors-Difficulity-Estimation.xlsm.csv` exist as tracked files in the main repository;
- documentation that calls these filenames reserved for the gallery repository only;
- tests covering the "main repo duplicate exists" failure path.

The system should fail loudly rather than guessing which copy to trust.

## Documentation Changes

Update the main repository docs (`README.md`, `AGENTS.md`, `CLAUDE.md`, relevant skill docs/specs if they describe ownership) so they consistently state:

- the gallery repo is the single source of truth for evaluation records;
- the main repo contains tooling, not canonical evaluation content;
- evaluation work is incomplete if edits were made anywhere other than the gallery checkout;
- missing gallery checkout is a setup error, not a warning.

Any remaining references that describe the main repo `docs/` directory as the source of truth must be removed or rewritten.

## Verification

Implementation is complete only if fresh evidence shows all of the following:

- the three evaluation docs no longer exist as tracked files in `re-canvas-door-swing`;
- the sibling gallery repo contains the canonical copies;
- `npm run gallery:check` passes against the new ownership model;
- automated tests cover the new path resolution and duplicate-detection behavior;
- `check-door` instructions no longer direct edits to the main repo copies.

Minimum expected verification commands for the implementation plan are:

- `npm run gallery:check`
- `python3 -m pytest scripts/tests/test_gallery_assets.py -q`
- `git ls-files -- docs/door-classifications.md docs/door-classification-report.md docs/Doors-Difficulity-Estimation.xlsm.csv` (expected: no output in `re-canvas-door-swing`)
- `git -C ../re-door-gallery ls-files -- docs/door-classifications.md docs/door-classification-report.md docs/Doors-Difficulity-Estimation.xlsm.csv` (expected: all three canonical files are tracked)

## Risks

- Existing scripts may assume the main repo always has `docs/door-classifications.md`; those assumptions must be removed everywhere, not patched case-by-case.
- Partial migration is worse than the current state because it can leave both repos half-authoritative.
- Any future convenience fallback to main-repo copies would silently reintroduce drift and must be treated as a regression.
