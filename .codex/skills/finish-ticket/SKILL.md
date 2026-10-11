---
name: finish-ticket
description: Use when the user requests finish ticket, 完成票／結案, or finishing the current ticket branch through PR review and merge, including updating related issue progress.
---

# Finish Ticket

Complete the selected ticket scope through push, PR, independent review, separate-agent fixes, verified merge into main, and progress synchronization. Invoking this workflow authorizes those actions for the selected work; do not ask again at each step. Repository protections and tool approval controls still apply.

## Recover scope and verify

- Read repository instructions, branch metadata from `start-ticket`, associated issue, exact source/preset, progress overview and PR if present. If branch/ticket/animation association remains ambiguous, ask the specific missing question before pushing or merging; do not guess from a category name.
- Inspect branch/base, commits and dirty diffs. Commit only this task's work using repository conventions. Preserve unrelated files/commits; never reset, automatically stash, force-push or publish unrelated work. Prepare a feature branch first if currently on main; use a worktree only when the user requests one.
- Run fresh checks appropriate to the final change: required tests, lint/build and animation visual/source comparison when applicable. Yesterday's results are not current evidence. Record actual results and remaining limits. Include repository progress-document changes in the reviewed PR, describing the delivered implementation accurately and linking its PR for merge state; do not assert a pending PR is already merged/published.

## Push and create PR

1. Push the feature branch with upstream tracking. Reuse its existing PR, otherwise create a reviewable PR targeting main (or the explicitly selected integration branch), including exact source/preset, behavior, validation, visual evidence and remaining category scope. Use structured body arguments or a body file.
2. For a partially implemented multi-source ticket, use `Refs #N`, not `Closes/Fixes #N`. Closing keywords are valid only when all ticket acceptance criteria are satisfied. A representative or Leave variant does not complete another selected source.
3. When T3 exposes `link_pull_request`, register the full URL immediately after creating or starting work on the PR; before finishing, verify it appears in `list_thread_pull_requests`. Report linking failures accurately.

## Required sub-agent review and fixes

This skill explicitly delegates review and remediation. Keep reviewer and fixer as different agent identities. Neither may merge, close issues, modify Project status or push; the parent owns those actions.

1. Spawn reviewer A with ticket/source requirements, base/head SHAs, PR URL and verification evidence. Ask for actionable findings with file/line, severity and reasoning, plus source-fidelity/scope risks. Reviewer is read-only and must inspect the actual diff. Inspect existing human/bot PR review comments too.
2. For actionable findings, spawn a different fixer B with the findings and bounded file ownership. B validates each finding, fixes justified defects, adds/runs relevant checks and reports changes or evidence-backed disagreement. Do not let A fix its own findings. If there are no findings, no fixer is needed.
3. Inspect B's diff, run affected checks, commit and push fixes, and ask A to review the changed head. Repeat until actionable blocking findings are resolved. A rejected suggestion needs explicit reasoning, not silent dismissal. If head or base changes invalidate checks/review, revalidate the affected work.
4. Repeated unresolved defects, unavailable delegation, failed checks or missing required approvals block merge. Report the concrete blocker and leave PR open; do not replace required independent review with self-review. Never bypass branch protections. If automatic approval review rejects an action, identify the rejected action and reason to the user.

## Merge, close and synchronize

- Check the exact reviewed head SHA, current base, CI, required reviews, conflicts and repository-supported merge method. Resolve ordinary conflicts on the feature branch and reverify changed behavior. Merge the PR into main only when these checks pass; do not close the PR before merging. GitHub closes it as part of merge.
- Read back the merged state and merge commit. Fetch/update local main by fast-forward only when safe; preserve dirty edits and never force-reset a user's checkout. A remote merge can succeed while local checkout remains on the feature branch—report this accurately. Do not delete branches/worktrees unless requested.
- After verified merge, update the selected source's ticket/checklist, overview, parent/related engineering tickets and Project status. Close the implementation issue only if its entire acceptance scope is complete; otherwise leave it open/In Progress and state remaining sources. Recompute per-video counts rather than counting presets or category statuses. Mark merged, not published, unless a release is separately verified.
- For `re-canvas-door-swing`, synchronize category #30–#49, overview #63, applicable engineering tickets (#24–#29/#58), `docs/phase1-door-progress.md` and Project. Include known repository-document updates in the reviewed PR. If post-merge facts require further repository edits, deliver those through a small follow-up branch/PR with appropriate verification and independent review; do not directly push unreviewed edits to main. Do not close #63 until all 35 selected sources and its remaining acceptance work are complete.
- Read back online issue/Project/overview changes. Summarize PR link, merge commit, checks, resolved review findings and tickets closed or left open. State any remaining publication or source-QA work.

Example: a branch implements only one of #31's three selected source videos. Merge that bounded PR using `Refs #31`, update the corresponding row in #63, and retain #31 as In Progress with two pending sources. S5 yellow-panel work does not complete the selected S9 running door.
