# Agent workflow

This file controls agents that use the `.fleet` workflow. Follow it exactly.
[CONTRIBUTING.md](CONTRIBUTING.md) explains the same workflow to human readers. It defines nothing.

## Non negotiable rules

1. A builder does not verify its own work. An independent reviewer regenerates every claim.
2. Workers and reviewers run as the subagents defined in `.pi/agents/`. Their model is set there, not in the prompt.
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

## Files


| Path                     | Holds                                                 |
| ------------------------ | ----------------------------------------------------- |
| `.fleet/stories/<id>.md` | The work order for one reversible change              |
| `.fleet/handoffs/`       | Build records, gates, and review findings             |
| `.fleet/designs/`        | One standalone HTML prototype for each frontend story |


## Scope

- Work in the assigned worktree only.
- Change only the paths listed in the story. Do not widen the list.
- Every story must list `.fleet/**` in its allowed paths. This authorizes workflow artefacts, stories, handoffs, and designs.
- Never delete branches, worktrees, or files that you did not create.

## Read before you work

- Read the assigned story at the start of every pass.
- Before working in a workspace, read the applicable `AGENTS.md` for that workspace.

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

### Frontend stories

- A frontend story must reference its prototype in the Design section. The orchestrator creates the prototype during story preparation. It must be present before the worker starts implementation. A prototype is accurate only in the part related to the story.
- The prototype is the visual reference. Use the target resolutions in the applicable workspace `AGENTS.md`. The story specifies a viewport only when it requires a non-standard size.
- For a screenshot probe, render the prototype and the actual app at every target resolution, in the state shown or required by the story. Inspect both screenshots and compare the visual result. Do not assess the source code of the prototype.

## Handoffs

A handoff is a file in `.fleet/handoffs/`. It is the report of a pass. The closing message of a subagent is not.


| File                        | Written by         | Meaning                                     | Format                                                        |
| --------------------------- | ------------------ | ------------------------------------------- | ------------------------------------------------------------- |
| `<id>.build.json`           | Worker             | One implementation pass, `done` or `failed` | [build.json](.fleet/templates/build.json)                     |
| `<id>.gate.json`            | Worker or reviewer | The pass stopped for a maintainer decision  | [gate.json](.fleet/templates/gate.json)                       |
| `<id>.review.json`          | Reviewer           | The findings of one review                  | [review-findings.json](.fleet/templates/review-findings.json) |
| `<id>.gate.superseded.json` | Orchestrator       | A gate that the maintainer resolved         | Same as the gate                                              |


These rules apply to every handoff:

- A pass ends with exactly one terminal handoff. A worker writes `build.json` or `gate.json`. A reviewer always writes `review.json`, and writes `gate.json` after it when a maintainer decision is required; the gate is then the terminal handoff.
- Each role overwrites the handoff of its current pass at the fixed story path. Only that handoff is active. Earlier versions stay in Git history and are not active. `<id>.gate.superseded.json` is never active.
- A reviewer writes `[]` when it has no findings. It never leaves a previous handoff in place and never issues a pass or fail verdict.
- The agent commits its terminal handoff in its assigned worktree before it ends the pass.

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

In short: `done` is ready for review, `failed` is not technically completable, and a gate requires a maintainer decision.

### Gates

Stop immediately when a maintainer decision is required. Write the gate and end the pass. Do not wait in process. A worker writes only the gate. A reviewer records its current findings in `review.json` first, then writes the gate.

A worker or reviewer opens a gate only when the story itself needs a maintainer decision. A dirty launch base is not a gate.

Examples of a gate:

- The story does not define the required behaviour.
- A correction requires a path outside the allowed paths.
- More than one valid solution exists and the maintainer must choose one.
- A reviewer finding cannot be repaired within the story and its allowed paths.
- A second review reports findings.

Use this format:

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

The gate must let the maintainer decide without reopening the work. An active gate has `"resolution": null`.

### Resolve a gate

Only the orchestrator resolves a gate, and only after the maintainer selects an option. In the worktree that holds the active gate:

1. Record the decision and reason in `resolution`. Use `finding_rejected` as `resolution.decision` when the maintainer rejects a reviewer finding.
2. Rename `.fleet/handoffs/<id>.gate.json` to `.fleet/handoffs/<id>.gate.superseded.json`. Replace an older superseded gate when necessary. Git preserves every earlier version.
3. Commit the change before you launch a resumed pass or declare an exception candidate commit.

Never fast forward merge a reviewer branch that holds an active gate into `worker/<id>`.

## Orchestrator

- Do not edit product code, except for a non-functional chore explicitly requested by the maintainer during the final human review.
- Do not invent work. Create a story only from the current maintainer discussion.
- Create one story for one reversible change. Split changes that mix data model changes with behaviour changes.
- Define direct, falsifiable probes before creating a story.
- When a decision belongs to the maintainer, require the worker or reviewer that found it to open a gate. Do not open a gate yourself.
- Launch and supervise every worker and reviewer. Report only observed process state and recorded handoffs to the maintainer.
- Do not open a gate for a dirty or uncommitted launch base. This is a launch precondition failure. Tell the maintainer to commit the intended story, prototype, and workflow files, or to remove the unwanted changes. Wait for a clean base before you launch an agent.

### Launch an agent

Every agent runs in its own branch and worktree, and starts from committed state. Uncommitted files are not copied.

Call the `subagent` tool with `cwd` set to the absolute worktree path, `isolation: "none"`, `context: "fresh"`, and `async: false`. The call blocks until the child ends, so its completion is a first class result instead of a string parsed from terminal output. Do not run `pi` from the shell.

Every spawn instruction states the story id, the absolute path of the assigned worktree, which is the agent's root, and that the agent must read `AGENTS.md`, `AGENTS_CONTRIBUTING.md`, and `.fleet/stories/<id>.md` at the start of every pass. Everything else is already in `.pi/agents/`. Do not restate the role in the prompt and do not weaken it.

### Launch a worker

The maintainer must first commit the story, its frontend prototype when required, and all workflow files that the worker must read, including `.pi/agents/`. Check that the base is clean, then create the worktree from `HEAD`:

```sh
git worktree add -b worker/<id> .worktree/<id> HEAD
```

Spawn `agent: "fleet-worker"`. The instruction adds one read to the standard list when the pass is not the first:

- A repair pass reads `.fleet/handoffs/<id>.review.json` after the story.
- A resumed pass after a resolved worker gate reads `.fleet/handoffs/<id>.gate.superseded.json` after the story.

### Launch a reviewer

Create one branch and one dedicated clean worktree for each review, at the current `worker/<id>` commit:

```sh
git worktree add -b reviewer/<id>/<n> .worktree/<id>-review-<n> worker/<id>
```

`<n>` is a new review sequence number. Spawn `agent: "fleet-reviewer"`.

### Supervise an agent

- Wait on the subagent. The runtime reports its completion. There is no exit file, no process check, and no polling loop.
- The agent is `running` until the runtime returns it. A quiet subagent, a long pause, or no intermediate message all mean `running with no new observation`. None of them means `dead`. Never report a running agent as terminated.
- Do not spawn a second agent to ask about the first one.
- When the subagent returns, inspect its worktree for the terminal handoff of the current pass. The handoff is the report.
- Confirm that the worktree is clean and that the handoff is committed.
- If the subagent returns without a terminal handoff for the current pass, report the exception to the maintainer and stop. Do not change the repository or relaunch automatically.

### Supervise a worker

The terminal handoff decides the next step.

- `done`: launch a reviewer. The reviewer requires a clean worktree at that commit.
- `failed`: report the failure to the maintainer. Do not launch a reviewer and do not relaunch the worker automatically.
- Gate: report the gate to the maintainer. After the decision, resolve the gate on `worker/<id>` and launch a resumed worker pass in the same worktree. Do not launch a reviewer until that pass returns a committed `done` build handoff.

### Supervise a reviewer

A review cycle has at most two reviews. When a review reports findings, do not run another review against the same commit. A review-record commit contains no product changes and does not need another review.

After the first review:

- No active gate: fast forward merge the reviewer branch into `worker/<id>` in the worker worktree.
  ```sh
  git -C .worktree/<id> merge --ff-only reviewer/<id>/<n>
  ```
- No findings: the technical story is complete.
- Findings that are repairable within the story and its allowed paths: send the worker a repair pass. The worker reads the merged `review.json`, commits the repair and its build handoff. Then launch the second review in a clean worktree at the new commit.

After the second review:

- No findings: its reviewer branch tip is the candidate commit. Do not merge it into `worker/<id>` before the final maintainer review.
- Findings: the reviewer opens a gate. Report it to the maintainer, who decides whether to accept the finding.
  - Rejected: the resolved-gate commit is an exception candidate commit and completes the technical story.
  - Accepted: fast forward merge the reviewer branch into `worker/<id>`, send the worker a repair pass, and start a new review cycle with a fresh independent first review after the repair commit.

### The candidate commit

The candidate commit represents the technical approval stamp from the agent. It is one of these:

- The last reviewer handoff commit whose `review.json` contains `[]`.
- An exception candidate commit, whose superseded gate has `resolution.decision` set to `finding_rejected`.

### Final maintainer review

Declare the technical story completed when a candidate commit exists. On the base branch, run `git merge --squash <candidate-commit>`. Do not commit the merge result. The candidate product changes must remain staged for the maintainer. Keep every worktree until the maintainer makes the final commit.

The maintainer reviews code quality on the base branch. If satisfied, the maintainer commits and pushes the candidate change.

If the maintainer requests a non-functional chore, the orchestrator applies it directly on the base branch. It must not change acceptance criteria, probes, `red_when` breakages, tests, or functional behaviour. The orchestrator runs the complete existing test suite for each affected workspace as a regression check, stages the chore changes, then returns the staged change to the maintainer for another final review. These tests are not a replacement for independent acceptance verification.

## Worker

The worker role is defined in [.pi/agents/fleet-worker.md](.pi/agents/fleet-worker.md). A worker follows the shared rules in this file and the role instructions in that definition.

## Reviewer

The reviewer role is defined in [.pi/agents/fleet-reviewer.md](.pi/agents/fleet-reviewer.md). A reviewer follows the shared rules in this file and the role instructions in that definition. Reviewers are independent in their evidence generation and code ownership, but informed by the build and earlier review handoffs for the current story.

## Helpers

Use these scripts to write standard files. Handoff scripts overwrite the existing handoff for the current pass.

```sh
scripts/fleet/new-story.sh <id>
scripts/fleet/open-gate.sh <id>
scripts/fleet/record-build.sh <id>
scripts/fleet/record-review.sh <id>
```

