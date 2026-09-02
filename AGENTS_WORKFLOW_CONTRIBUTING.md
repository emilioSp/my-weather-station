# Agent workflow

This file controls agents that use the `.fleet` workflow. Follow it exactly.

## Non negotiable rules

1. A builder does not verify its own work. An independent reviewer regenerates every claim.
2. Workers and reviewers run as the subagents defined in `.codex/agents/`. Their model is set there, not in the prompt.
3. A probe must touch the claimed result and must fail when its `red_when` breakage is applied.
4. When a requirement is ambiguous, stop and open a gate. Do not guess.
5. The repository is the only persistent state. Write important outcomes to `.fleet/handoffs/` before ending a pass.

## Authority and communication

```text
Maintainer <-> Orchestrator <-> Worker or reviewer
```

- The maintainer gives work and decisions only to the orchestrator.
- The orchestrator is the only agent that launches, monitors, and directs workers and reviewers.
- Workers and reviewers do not ask the maintainer for direction. They write a gate handoff and stop when a maintainer decision is required.
- The maintainer receives status only from the orchestrator. A missing worker report is not a worker status.
- The maintainer commits the initial story and workflow files before a worker starts.
- Workers commit their changes and terminal handoffs in their assigned worktrees.
- Reviewers commit their terminal handoffs in their assigned worktrees.
- The orchestrator commits resolved-gate state changes.
- The maintainer makes the final commit.

## Files and scope

- `.fleet/stories/<id>.md` is the work order for one reversible change.
- `.fleet/handoffs/` contains build records, gates, and review findings.
- `.fleet/designs/` contains one standalone HTML prototype for each frontend story.
- Read the assigned story at the start of every pass.
- Before working in a workspace, read the applicable `AGENTS.md` for that workspace.
- Work in the assigned worktree only.
- Change only the paths listed in the story. Do not widen the list.
- Every story must list `.fleet/**` in its allowed paths. This authorizes workflow artefacts, stories, handoffs, and designs.
- A frontend story must reference its prototype in the Design section. The orchestrator creates the prototype during story preparation. It must be present before the worker starts implementation. A prototype is accurate only in the part related to the story.
- A frontend story uses its prototype as the visual reference. Use the target resolutions in the applicable workspace `AGENTS.md`. The story specifies a viewport only when it requires a non-standard size.
- Never delete branches, worktrees, or files that you did not create.

## Stories

The maintainer and orchestrator create stories from their discussion. A story must contain:

- Problem
- Constraints
- Allowed paths
- A Design section with `.fleet/designs/<id>.html` for frontend stories
- Acceptance criteria
- Out of scope work
- The `.fleet/**` allowed path

Each acceptance criterion must use this form:

```text
AC<n>: <claim>
probe: <exact command>
postcondition: <observable state>
red_when: <specific breakage that makes the probe fail>
```

Do not edit a story's acceptance criteria, constraints, allowed paths, or out of scope section. Open a gate if any of them is wrong, incomplete, or impossible.

Probes must observe the real effect. Do not accept a probe that reads a mock, write response, exit code, log line, filename, or another substitute for the claimed result. After a write, re read through a separate call. Assert both rejection and unchanged state when the criterion requires both.

For frontend screenshot probes, render the prototype and the actual app at every target resolution in the applicable workspace `AGENTS.md`, in the state shown or required by the story. Inspect both screenshots and compare the visual result. The prototype is a visual reference. Do not assess its source code.

## Orchestrator

- Do not edit product code, except for a non-functional chore explicitly requested by the maintainer during the final human review.
- Do not invent work. Create a story only from the current maintainer discussion.
- Create one story for one reversible change. Split changes that mix data model changes with behaviour changes.
- Define direct, falsifiable probes before creating a story.
- When a decision belongs to the maintainer, require the worker or reviewer that found it to open a gate. Do not open a gate yourself.
- Launch and supervise every worker and reviewer. Report only observed process state and recorded handoffs to the maintainer.
- Do not open a gate for a dirty or uncommitted launch base. This is a launch precondition failure. Tell the maintainer to commit the intended workflow files or remove unwanted changes, then refer to `CONTRIBUTING.md`.

### Launch a worker

After creating a story, the maintainer must commit the story, its frontend prototype when required, and all workflow files that the worker must read, including `.codex/agents/`. The orchestrator creates `.worktree/<id>` from the current committed `HEAD`; uncommitted files are not copied.

The orchestrator checks that the base is clean, then creates the worktree directly:

```sh
git worktree add -b worker/<id> .worktree/<id> HEAD
```

The orchestrator then spawns the `fleet-worker` subagent defined in `.codex/agents/worker.toml`. Do not shell out to `codex exec`. The runtime owns the child's lifecycle, so its completion is a first class result instead of a string parsed from terminal output.

The spawn instruction must state:

- The story id.
- The absolute path of the assigned worktree, which is the worker's root.
- That the worker must read `AGENTS.md` and `AGENTS_WORKFLOW_CONTRIBUTING.md` first, then `.fleet/stories/<id>.md` at the start of every pass.
- For a repair pass, that it must read `.fleet/handoffs/<id>.review.json` after the story.
- For a resumed pass after a resolved worker gate, that it must read `.fleet/handoffs/<id>.gate.superseded.json` after the story.

Everything else the worker needs is already in `.codex/agents/worker.toml`. Do not restate the role in the prompt and do not weaken it.

### Supervise a worker

- Wait on the subagent. The runtime reports its completion. There is no exit file, no process check, and no polling loop.
- The worker is `running` until the runtime returns it. A quiet subagent, a long pause, or no intermediate message all mean `running with no new observation`. None of them means `dead`.
- Do not spawn a second agent to ask about the first one.
- When the subagent returns, inspect the assigned worktree for the active terminal handoff written by the worker in the current pass: `.fleet/handoffs/<id>.build.json` or `.fleet/handoffs/<id>.gate.json`. Historical handoffs from earlier roles or passes remain in Git history and are not active. Ignore `.fleet/handoffs/<id>.gate.superseded.json`. The worker must overwrite its terminal handoff for the current pass. The handoff is the report. The subagent's closing message is not.
- The worker commits its changes and terminal handoff before it ends. After a `done` build handoff, confirm that the worker worktree is clean and its handoff is committed before launching a reviewer. The reviewer requires a clean worktree at that commit.
- After a `failed` build handoff, confirm that the worker worktree is clean and its handoff is committed. Do not launch a reviewer or relaunch the worker automatically, and report the failure to the maintainer.
- After a worker gate, confirm that the worker worktree is clean and its gate is committed, then report the gate to the maintainer. After the maintainer selects an option, record the decision and reason in the gate, rename it to `.fleet/handoffs/<id>.gate.superseded.json`, and commit the change on `worker/<id>`. Launch a resumed worker pass in that worktree. Do not launch a reviewer until that pass returns a committed `done` build handoff.
- If the subagent returns without a terminal handoff for the current pass, report the exception to the maintainer and stop. Do not change the repository or relaunch automatically.
- Never report a running worker as terminated.

If the base is dirty, tell the maintainer to fix it. A worker or reviewer opens a gate only when the story itself needs a maintainer decision.

### Launch a reviewer

The orchestrator creates one reviewer branch and one dedicated clean worktree for each review. It starts the branch at the current `worker/<id>` commit:

```sh
git worktree add -b reviewer/<id>/<n> .worktree/<id>-review-<n> worker/<id>
```

`<n>` is a new review sequence number. The orchestrator spawns `fleet-reviewer` in that worktree. Its spawn instruction states the story id, the absolute worktree path, and that it must read `AGENTS.md`, `AGENTS_WORKFLOW_CONTRIBUTING.md`, and `.fleet/stories/<id>.md` first.

### Supervise a reviewer

- Wait on the subagent. The runtime reports its completion.
- When the subagent returns, inspect the assigned worktree for `review.json` written by the reviewer in the current pass. If it opened a gate, it must also write `gate.json`; the gate is then the active terminal handoff. Otherwise, `review.json` is the active terminal handoff. Historical handoffs from earlier passes remain in Git history and are not active. Ignore `.fleet/handoffs/<id>.gate.superseded.json`. The reviewer must overwrite `review.json` for the current pass and write `[]` when it has no findings. The handoff files are the report. The subagent's closing message is not.
- If the subagent returns without the required handoff files for the current pass, report the exception to the maintainer and stop. Do not change the repository or relaunch automatically. Never report a running reviewer as terminated.
- The reviewer commits its handoff files before it ends. Confirm that the reviewer worktree is clean and its handoff files are committed. A review-record commit contains no product changes and does not need another review.
- A review cycle has at most two reviews. When a review reports findings, do not run another review against the same commit.
- If the first review has no gate, fast forward merge its reviewer branch into `worker/<id>` in the worker worktree:

  ```sh
  git -C .worktree/<id> merge --ff-only reviewer/<id>/<n>
  ```

  No findings complete the technical story. If its findings are repairable within the story and its allowed paths, send the worker a repair pass. The worker reads the merged `review.json`, commits the repair and its build handoff, then launch the second review in a clean worktree at the new commit.
- After a second review with no findings, its reviewer branch tip is the candidate commit. It is the last reviewer handoff commit whose `review.json` contains `[]`. Do not merge it into `worker/<id>` before the final maintainer review.
- The reviewer opens a gate after findings from the second review, or when a finding from either review cannot be repaired within the story and its allowed paths. It writes the findings to `review.json` before it writes the gate. The maintainer decides whether to accept the finding. If the maintainer rejects it, record `finding_rejected` and the reason in the superseded gate. That resolved-gate commit is an exception candidate commit and completes the technical story. If the maintainer accepts it, record the decision in the superseded gate, fast forward merge the reviewer branch into `worker/<id>`, send the worker a repair pass, and start a new review cycle with a fresh independent first review after the repair commit.

### Final maintainer review

After the reviewer reports no findings, or after the maintainer rejects a reviewer finding, declare the technical story completed. A candidate commit is either the last reviewer handoff commit whose `review.json` contains `[]`, or an exception candidate commit with a superseded gate whose `resolution.decision` is `finding_rejected`. On the base branch, run `git merge --squash <candidate-commit>`. Do not commit the merge result. The candidate product changes must remain staged for the maintainer. Keep every worktree until the maintainer makes the final commit.

The maintainer reviews code quality on the base branch. If satisfied, the maintainer commits and pushes the candidate change.

If the maintainer requests a non-functional chore, the orchestrator applies it directly on the base branch. It must not change acceptance criteria, probes, `red_when` breakages, tests, or functional behaviour. The orchestrator runs relevant existing tests only as regression checks, stages the chore changes, then returns the staged change to the maintainer for another final review. These tests are not a replacement for independent acceptance verification.

## Build statuses

A build handoff records one implementation pass. Its status has one of these meanings.

### `done`

`done` means the worker completed an implementation pass that is ready for independent review. It does not mean the worker approved its own work.

A worker uses `done` only when all these conditions are true:

- It changed only allowed paths.
- It recorded builder evidence for every acceptance criterion.
- Every stated `red_when` breakage made its probe fail.
- After each restore, the probe succeeded again.
- `npm run lint` succeeded.
- No maintainer decision is required.

### `failed`

`failed` means the worker cannot produce a reviewable candidate with the current story, constraints, and environment. It is a technical execution result, not a request for a product, scope, or requirement decision.

A failed handoff must record each incomplete acceptance criterion, the commands and observed output, the precise technical reason, and any partial changes. The `acs` entries must state the observed `red_ok` and `green_ok` values.

Examples of `failed`:

- A required external service is unavailable.
- A required tool does not work in the assigned environment.
- A probe remains unsuccessful after corrections that stay within the story constraints.

### `gate.json`

Use `.fleet/handoffs/<id>.gate.json`, not `build.json`, when a maintainer decision is required. Overwrite the gate handoff for every new gate pass.

Examples of a gate:

- The story does not define the required behaviour.
- A correction requires a path outside the allowed paths.
- More than one valid solution exists and the maintainer must choose one.

In short: `done` is ready for review, `failed` is not technically completable, and a gate requires a maintainer decision.

## Worker

The worker role and its terminal handoff format are defined in `.codex/agents/worker.toml`. A worker follows the shared rules in this file and the role instructions in that definition.

## Reviewer

The reviewer role and its finding format are defined in `.codex/agents/reviewer.toml`. A reviewer follows the shared rules in this file and the role instructions in that definition. Reviewers are independent in their evidence generation and code ownership, but informed by the build and earlier review handoffs for the current story. The orchestrator creates a dedicated reviewer worktree at the current `worker/<id>` commit and spawns a newly created `fleet-reviewer` subagent. It follows the reviewer supervision rules.

## Gates

Stop immediately when a maintainer decision is required. A reviewer first records its current findings in `.fleet/handoffs/<id>.review.json`, then writes `.fleet/handoffs/<id>.gate.json`. A worker writes only the gate. Use this gate format:

```json
{
  "id": "...",
  "decision_so_far": "...",
  "blocked": "...",
  "options": ["..."],
  "recommendation": "...",
  "next_steps": { "option": "..." },
  "resolution": null
}
```

The gate must let the maintainer decide without reopening the work. Do not wait in process after writing it. An active gate has `"resolution": null`.

When the maintainer resolves a gate, the orchestrator records the decision and reason in `resolution`, then renames `.fleet/handoffs/<id>.gate.json` to `.fleet/handoffs/<id>.gate.superseded.json` in the worktree that holds the active gate. Use `finding_rejected` as `resolution.decision` when the maintainer rejects a reviewer finding. Replace an older superseded gate when necessary. Git preserves every earlier version. The orchestrator commits the change before it launches a resumed pass or declares an exception candidate commit. The orchestrator must not fast forward merge a reviewer branch with an active gate into `worker/<id>`.

## Helpers

Use these scripts to write standard files. Handoff scripts overwrite the existing handoff for the current pass.

```sh
scripts/fleet/new-story.sh <id>
scripts/fleet/open-gate.sh <id>
scripts/fleet/record-build.sh <id>
scripts/fleet/record-review.sh <id>
```
