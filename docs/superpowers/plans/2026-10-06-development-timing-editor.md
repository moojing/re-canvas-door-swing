# Development Timing Editor Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved plan.

**Goal:** Hide timing editors by default and retain explicit local calibration.

**Architecture:** Gate the existing timing controls with Vite DEV and an opt-in
environment flag. Add a named calibration command and exercise its server
alongside the normal server in browser tests.

**Tech Stack:** React, Vite, TypeScript, Playwright.

- [x] Add a browser regression proving normal detail has no timing sliders but
      retains stage seek, progress, Play and Reset. Observe failure first.
- [x] Gate timing sliders/copy in `AnimationPreviewWorkbench.tsx`; add root and
      sample calibration scripts and `.env.calibration` opt-in.
- [x] Update browser server configuration and timing-edit tests to use the
      calibration server. Verify ordinary and opt-in behavior.
- [x] Run browser tests, lint and build. Verify a production build ignores the
      opt-in. Record the commands in README.
- [x] Review the diff, capture UI evidence, update PR #60 and leave normal and
      calibration local servers running for the user.

Verification: the ordinary-preview regression failed first (7 timing sliders
instead of 0). After the gate, all 30 browser tests passed; a focused 2-test
screenshot run also passed. Lint and full build passed with existing warnings.
Independent spec/plan and code reviews found no blockers. Screenshots were
rendered and inspected for both modes. Local servers use ports 5176 and 5177.
