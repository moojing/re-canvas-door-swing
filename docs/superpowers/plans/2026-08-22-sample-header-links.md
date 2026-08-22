# Sample Header Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimal external documentation and stakeholder-picker links above the sample preset catalog.

**Architecture:** Keep the home page as the single owner of the header because the links only describe the catalog surface. Add one focused source-level test that verifies each named anchor has its own expected destination and safe external-link behavior; do not change library APIs or catalog data.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner, Vite.

---

### Task 1: Define the header-link contract

**Files:**
- Create: `packages/sample/src/pages/Index.header.test.mjs`
- Modify: `packages/sample/src/pages/Index.tsx`

- [ ] Write a failing Node test that reads `Index.tsx` and matches the complete `GitHub README` anchor and complete `Stakeholder picker` anchor independently. Each match must include its expected URL, `target="_blank"`, and `rel="noreferrer"`.
- [ ] Run `node --test packages/sample/src/pages/Index.header.test.mjs`; it must fail before the header exists.
- [ ] Add a flex header before the existing catalog heading. Use `justify-between` to keep the compact product name at the left and a wrapping link group at the right on desktop; allow the whole header to wrap on narrow screens. Use the existing palette, visible labels, and `ArrowUpRight`.
- [ ] Re-run `node --test packages/sample/src/pages/Index.header.test.mjs`; it must pass.
- [ ] Commit the test and `Index.tsx` with `feat: add sample header links`.

### Task 2: Verify the catalog remains usable

**Files:**
- Modify: none

- [ ] Run `npm run lint` and `npm run build:sample`; expect exit 0 with only existing Fast Refresh warnings.
- [ ] Run `npm run test:lib:browser`; expect modal playback and full-screen transition coverage to pass.
- [ ] Inspect the home page at desktop and mobile widths. Confirm both links are visible, wrap cleanly, and leave catalog controls usable.
- [ ] Check `git status --short` to confirm no implementation files are unstaged.
