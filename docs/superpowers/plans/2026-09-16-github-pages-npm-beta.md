# GitHub Pages npm Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy GitHub Pages from the published `retro-horror-door@0.2.0-beta.0` and its jsDelivr assets.

**Architecture:** Add a reusable beta-build launcher beside the existing interactive beta-dev launcher. It installs an exact package version in an isolated temporary npm prefix, then starts the sample production build with the installed library entry and CDN asset mode. The Pages workflow calls that launcher instead of building the workspace library.

**Tech Stack:** npm workspaces, Node.js child processes, Vite, GitHub Actions, GitHub Pages.

---

### Task 1: Non-interactive beta build launcher

**Files:**
- Create: `packages/sample/build-beta-sample.mjs`
- Modify: `packages/sample/package.json`
- Test: `packages/sample/beta-sample.test.mjs`

- [ ] **Step 1: Write the failing launcher test**

Assert that the launcher accepts an exact version, invokes an isolated npm install, runs the sample `build` command, sets `DOOR_PACKAGE_ENTRY` to the isolated package's `dist/index.js`, and sets `VITE_DOOR_ASSET_MODE=cdn`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test packages/sample/beta-sample.test.mjs`

Expected: FAIL because the production beta launcher does not exist.

- [ ] **Step 3: Implement the minimal launcher**

Reuse the existing version validation and isolated-prefix logic. Keep the launcher non-interactive and propagate the build exit status.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test packages/sample/beta-sample.test.mjs`

Expected: PASS.

### Task 2: GitHub Pages workflow

**Files:**
- Modify: `.github/workflows/deploy-gh-pages.yml`
- Test: `packages/sample/beta-sample.test.mjs`

- [ ] **Step 1: Extend the failing test**

Assert that the workflow invokes the beta production build with `0.2.0-beta.0`, does not run `build:lib`, and deploys `packages/sample/dist`.

- [ ] **Step 2: Update the workflow**

Replace the workspace library/sample build block with the exact beta build command. Preserve checkout, npm cache, deployment branch, and deployment folder.

- [ ] **Step 3: Run focused verification**

Run: `node --test packages/sample/beta-sample.test.mjs`

Expected: PASS.

### Task 3: Published-package build verification

**Files:**
- Modify: `docs/cdn-assets.md`

- [ ] **Step 1: Run the beta build locally**

Run: `npm run build:beta --workspace retro-horror-door-sample -- 0.2.0-beta.0`

Expected: `packages/sample/dist` is produced after a temporary isolated npm install.

- [ ] **Step 2: Inspect the deployed asset model**

Assert the output references `https://cdn.jsdelivr.net/npm/retro-horror-door-assets@0.1.0-beta.0` and does not include local door asset binary filenames.

- [ ] **Step 3: Document the workflow**

Explain that pushes to `main` deploy the configured beta, and that advancing the beta requires intentionally updating the workflow version.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-gh-pages.yml packages/sample/build-beta-sample.mjs packages/sample/beta-sample.test.mjs packages/sample/package.json docs/cdn-assets.md
git commit -m "ci: build GitHub Pages from npm beta"
```
