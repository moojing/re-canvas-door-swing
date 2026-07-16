# Gallery Single Source Of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the three evaluation records to `../re-door-gallery` as the only canonical copies and make the main repository fail closed if local duplicates return.

**Architecture:** Update the gallery tooling to resolve and validate evaluation data from the sibling gallery checkout, then remove the local tracked copies from the main repository. Guardrails live in `scripts/gallery_assets.py` and its tests, while workflow guidance is updated in repo docs and the `check-door` skill so future edits target the gallery path only.

**Tech Stack:** Python, unittest/pytest, Markdown docs, existing shell/git verification commands

---

### Task 1: Lock The New Ownership Rules In Tests

**Files:**
- Modify: `scripts/tests/test_gallery_assets.py`
- Reference: `scripts/gallery_assets.py`

- [ ] **Step 1: Write failing tests for gallery-owned evaluation docs**

Add tests that require:
- `gallery_consistency()` to parse classifications from `gallery/docs/door-classifications.md`
- a failure when the main repo tracks any of the three canonical evaluation filenames
- a failure when the gallery checkout is missing any canonical evaluation doc

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `python3 -m pytest scripts/tests/test_gallery_assets.py -q`
Expected: failures showing the old main-repo ownership assumptions still exist

- [ ] **Step 3: Write minimal implementation to satisfy the new tests**

Update `scripts/gallery_assets.py` only as needed to make the tests pass.

- [ ] **Step 4: Re-run the targeted tests**

Run: `python3 -m pytest scripts/tests/test_gallery_assets.py -q`
Expected: green for the new ownership tests

- [ ] **Step 5: Commit checkpoint**

```bash
git add scripts/tests/test_gallery_assets.py scripts/gallery_assets.py
git commit -m "test: cover gallery-owned evaluation records"
```

### Task 2: Redirect Runtime Tooling To Gallery-Owned Records

**Files:**
- Modify: `scripts/gallery_assets.py`
- Modify: `.agents/skills/check-door/SKILL.md`
- Modify: `.agents/skills/check-door/scripts/build_gallery.py`

- [ ] **Step 1: Update path-resolution behavior**

Make the main tooling read canonical evaluation docs from `DOOR_GALLERY_ROOT` / `../re-door-gallery/docs` and fail clearly if that checkout or any canonical doc is missing.

- [ ] **Step 2: Update `check-door` instructions**

Rewrite the skill so it reads/writes:
- `../re-door-gallery/docs/door-classifications.md`
- `../re-door-gallery/docs/door-classification-report.md` where applicable
- `../re-door-gallery/docs/Doors-Difficulity-Estimation.xlsm.csv`

- [ ] **Step 3: Update the gallery builder helper**

Make `build_gallery.py` source its markdown classification input from the gallery checkout rather than `re-canvas-door-swing/docs`.

- [ ] **Step 4: Re-run focused tests**

Run: `python3 -m pytest scripts/tests/test_gallery_assets.py -q`
Expected: pass with gallery-owned doc paths

- [ ] **Step 5: Commit checkpoint**

```bash
git add scripts/gallery_assets.py .agents/skills/check-door/SKILL.md .agents/skills/check-door/scripts/build_gallery.py scripts/tests/test_gallery_assets.py
git commit -m "feat: point evaluation tooling at gallery docs"
```

### Task 3: Rewrite Repo Guidance And Remove Main-Repo Canonical Copies

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-07-12-gallery-asset-ownership-design.md`
- Delete: `docs/door-classifications.md`
- Delete: `docs/door-classification-report.md`
- Delete: `docs/Doors-Difficulity-Estimation.xlsm.csv`

- [ ] **Step 1: Update documentation language**

Replace any wording that says the main repo `docs/` directory is the source of truth with gallery-only ownership language.

- [ ] **Step 2: Remove the local canonical copies**

Delete the three tracked evaluation docs from the main repository after the tooling/docs changes are in place.

- [ ] **Step 3: Verify Git no longer tracks them**

Run: `git ls-files -- docs/door-classifications.md docs/door-classification-report.md docs/Doors-Difficulity-Estimation.xlsm.csv`
Expected: no output

- [ ] **Step 4: Commit checkpoint**

```bash
git add README.md AGENTS.md CLAUDE.md docs/superpowers/specs/2026-07-12-gallery-asset-ownership-design.md
git rm docs/door-classifications.md docs/door-classification-report.md docs/Doors-Difficulity-Estimation.xlsm.csv
git commit -m "refactor: make gallery the evaluation source of truth"
```

### Task 4: Full Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the automated gallery tests**

Run: `python3 -m pytest scripts/tests/test_gallery_assets.py -q`
Expected: all pass

- [ ] **Step 2: Run the ownership consistency check**

Run: `npm run gallery:check`
Expected: success against the gallery-only ownership model

- [ ] **Step 3: Verify repository ownership on both sides**

Run: `git ls-files -- docs/door-classifications.md docs/door-classification-report.md docs/Doors-Difficulity-Estimation.xlsm.csv`
Expected: no output

Run: `git -C ../re-door-gallery ls-files -- docs/door-classifications.md docs/door-classification-report.md docs/Doors-Difficulity-Estimation.xlsm.csv`
Expected: all three paths listed

- [ ] **Step 4: Summarize residual risks**

Record any limitations, especially if there are references outside the writable main repo or if the sibling gallery checkout already contained unexpected drift.
