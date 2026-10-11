---
name: start-ticket
description: Use when the user asks to start a ticket, begin issue implementation, or 開始票／開始實作 in an animation project, especially when the issue or exact animation is missing or ambiguous.
---

# Start Ticket

Establish one explicit ticket-and-animation scope before creating its implementation branch. The default is a branch in the current checkout; use a worktree only when the user requests one.

## Identify the target

1. Read repository instructions, remote, current branch/status, the requested issue and its progress overview. Inspect existing presets and reference mappings before describing what is missing.
2. Require both the ticket (number/URL and repository) and the exact animation/source variant. Use an explicit choice already supplied in the conversation; do not ask again when both are clear.
3. If either is missing, ask a concise question and wait before creating a branch or implementing. For a multi-source/category ticket, offer its source filenames/names; never silently choose the first source, all sources, or a visually similar representative. A request explicitly covering all sources is valid scope.
4. Show the selected source and existing preset, if any. Distinguish a new implementation from calibration or another traversal. If reference and ticket disagree, explain the mismatch and confirm the intended variant instead of rewriting the selection.

Example: “start ticket #31” is incomplete when it lists S9 running door, the 1998 grid door and the 1999 iron-window door. Ask which animation to implement. Existing S5 yellow-panel hardware does not choose or complete S9.

## Prepare the branch

- Once scope is clear, inspect the diff, base branch and existing matching branches. Use `feat/ticket-<number>-<animation-slug>` or `fix/ticket-<number>-<animation-slug>`; honor the user's naming/base choices. Reuse an existing branch only if it matches the chosen work; do not duplicate it.
- Prefer current `origin/main` (or the repository's actual integration branch). Fetch without overwriting local changes. Account for existing commits and dirty files before switching.
- Preserve unrelated edits. Do not discard, automatically stash, include them in the task, or force-reset. Creating a branch may carry dirty files, so record which belong to this task and keep unrelated files out of commits. If branch creation would conflict, or ownership of edits is unclear, ask the specific missing question; do not substitute a worktree.
- If the user requested a worktree, follow the available worktree workflow and report its path. User preference takes precedence over skills that recommend worktrees generally.
- Record ticket URL, exact source/preset, base and scope in local branch metadata (for example `git config --local branch.<branch>.ticket-url`, `.animation-source`, `.ticket-scope`) so `finish-ticket` can recover the selection. Treat filenames as data and quote command arguments safely; no public reference assets belong in the runtime package.

## Start implementation and tracking

Update the relevant ticket/Project to In Progress and link its progress overview when the repository uses one. Scope this update to the selected animation; do not mark other sources completed. Then continue the user's authorized implementation with the applicable animation/prototype/calibration skills and checks. If only setup was requested, stop after setup.

For `re-canvas-door-swing`, read `AGENTS.md`, the local animation skills and latest calibration records. Synchronize the category ticket, #63, `docs/phase1-door-progress.md` and Project as work progresses. Keep S5 representatives and Leave variants out of the original 35-source completion count.

Report the chosen ticket, exact animation, branch (and worktree path only if requested), existing work to reuse, and next implementation step. Do not claim a branch or status update happened until read-back verifies it.
