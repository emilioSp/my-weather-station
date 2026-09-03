# Agent workflow

This file controls agents that use the `.fleet` workflow. Follow it exactly.
[CONTRIBUTING.md](CONTRIBUTING.md) explains the same workflow to human readers. It defines nothing.

## Non negotiable rules

1. A builder does not verify its own work. An independent reviewer regenerates every claim.
2. Workers and reviewers run as the subagents defined in `.pi/agents/`. Their model is set there, not in the prompt.
3. A probe must touch the claimed result and must fail when its `red_when` breakage is applied.
4. When a requirement is ambiguous, stop and hand the decision to the maintainer. Do not guess.
5. The repository is the only persistent state. Write important outcomes to `.fleet/handoffs/` before ending a pass.

## Authority and communication

```text
Maintainer <-> Orchestrator <-> Worker or reviewer
```

- The maintainer gives work and decisions only to the orchestrator.
- The orchestrator launches, monitors, and directs workers and reviewers.
- Workers and reviewers do not ask the maintainer for direction. They record the blocker and stop.
- The maintainer receives status only from the orchestrator. A missing worker report is not a worker status.
- The maintainer commits the initial story and workflow files before a worker starts.
- Workers and reviewers commit their changes and terminal handoffs in their assigned worktrees.
- The orchestrator commits every resolved gate and every rejected finding.
- The maintainer makes the final commit.

## Files


| Path                              | Holds                                                  |
| --------------------------------- | ------------------------------------------------------ |
| `.fleet/stories/<id>.md`          | The work order for one reversible change               |
| `.fleet/stories/<id>.evidence.md` | The builder evidence the worker records for that story |
| `.fleet/handoffs/`                | Builds, reviews, and gates                             |
| `.fleet/designs/`                 | One standalone HTML prototype for each frontend story  |


## Scope

- Work in the assigned worktree only.
- Change only the paths listed in the story. Do not widen the list.
- Every story must list `.fleet/**` in its allowed paths. This authorises workflow artefacts, stories, handoffs, and designs.
- Never delete branches, worktrees, or files that you did not create.

## Read before you work

- Read the assigned story at the start of every pass.
- IMPORTANT: before working in a workspace, read the applicable `AGENTS.md` for that workspace.

## Stories

The maintainer and orchestrator create stories from their discussion. A story must contain:

- Problem
- Constraints
- Allowed paths
- A Design section with `.fleet/designs/<id>.html` for frontend stories
- Acceptance criteria
- Out of scope work
- The `.fleet/**` allowed path

A story may also carry a Technical details section with the agreed approach.

Each acceptance criterion must use this form:

```text
AC<n>: <claim>
probe: <exact command>
postcondition: <observable state>
red_when: <specific breakage that makes the probe fail>
```

Do not edit a story's acceptance criteria, constraints, allowed paths, or out of scope section.
Orchestrator: do not launch a subagent if any of them is wrong, incomplete, or impossible.
Worker: open a gate if any of them is wrong, incomplete, or impossible.
Reviewer: record a finding.

Probes must observe the real effect. Do not accept a probe that reads a mock, write response, exit code, log line, filename, or another substitute for the claimed result.

### Frontend stories

- A frontend story must reference its prototype in the Design section.
  - It is the maintainer's responsibility to create the prototype during story preparation, either with the orchestrator or with another agent.
  - It must be present before the orchestrator starts the worker.
  - A prototype is accurate only in the part related to the story. It can be inaccurate in every other part, a different logo or a different footer for example. That does not matter.
- The prototype is the visual reference. Use the target resolutions in the applicable workspace `AGENTS.md`. The story specifies a viewport only when it requires a non-standard size.
- For a screenshot probe, render the prototype and the actual app at every target resolution, in the state shown or required by the story. Inspect both screenshots and compare the visual result.
- Do not assess the source code of the prototype.

## Handoffs

A handoff is a file in `.fleet/handoffs/`. It is the subagent report. The closing message of a subagent is not.


| File                 | Written by | Meaning                                                      | Format                                        |
| -------------------- | ---------- | ------------------------------------------------------------ | --------------------------------------------- |
| `<id>.build.json`    | Worker     | One implementation pass, `done` or `failed`                  | [build.json](.fleet/templates/build.json)     |
| `<id>.gate.<n>.json` | Worker     | A decision delegated to the maintainer, and later its answer | [gate.json](.fleet/templates/gate.json)       |
| `<id>.review.json`   | Reviewer   | The findings of one review pass                              | [review.json](.fleet/templates/review.json)   |


These rules apply to every handoff:

- A pass ends with exactly one terminal handoff.
  - A worker writes `build.json` or a gate.
  - A reviewer writes `review.json`.
- A build and a review belong to one pass. They are overwritten at each pass. Earlier versions stay in Git history.
- Gates are never overwritten. See [Gates](#gates).
- A reviewer writes `[]` when it has no findings. It never leaves a previous handoff in place and never issues a pass or fail verdict.
- The agent commits its terminal handoff in its assigned worktree before it ends the pass.

### Builds

A build records one implementation pass. The worker writes it at the end of the pass, with its status and the result of every probe.

`done` means the worker completed an implementation pass that is ready for independent review.

A worker uses `done` only when all these conditions are true:

- It changed only allowed paths.
- It recorded builder evidence for every acceptance criterion.
- Every stated `red_when` breakage made its probe fail.
- After each restore, the probe succeeded again.
- `npm run lint`, `npm run build`, and `npm run test` succeeded.
- No maintainer decision is required.

`failed` means the worker cannot produce a reviewable candidate with the current story, constraints, and environment. It is a technical execution result, not a request for a product, scope, or requirement decision.

A failed handoff must record each incomplete acceptance criterion, the commands and observed output, the precise technical reason, and any partial changes. The `acs` entries must state the observed `red_ok` and `green_ok` values.

On a failed handoff, report the status to the orchestrator and stop. The maintainer and the orchestrator triage the failure and decide what to do.

Examples of `failed`:

- A required external service is unavailable.
- A required tool does not work in the assigned environment.
- A probe remains unsuccessful after corrections that stay within the story constraints.

In short: `done` is ready for review, `failed` is not technically completable.

Build format is [build.json](.fleet/templates/build.json).

### Gates

A gate is a question about the story, delegated to the maintainer. Only a worker opens one, when it cannot finish the pass without an answer. Write the gate, commit it, and end the pass. Do not wait in process. A dirty launch base is not a gate.

Examples of a gate:

- The story does not define the required behaviour.
- A correction requires a path outside the allowed paths.
- More than one valid solution exists and the maintainer must choose one.
- The story cannot be verified as written.

Gates are numbered and permanent: `.fleet/handoffs/<id>.gate.<n>.json`, where `<n>` is the next free number for the story. Never overwrite a gate, never rename it, never delete it. Read in order, the gates of a story explain why it went the way it went.

An active gate has `"resolution": null`. A resolved gate has `"resolution"` filled.
Only the orchestrator writes a resolution, and only after the maintainer has decided. Fill `resolution` with the decision and the reason, in the gate file itself, and commit it in the worktree that holds the gate.

Gate format is [gate.json](.fleet/templates/gate.json).

### Reviews

A review records one review pass. The reviewer writes it as a list of findings, and writes `[]` when it found nothing.

A finding is technical evidence about one acceptance criterion or one story constraint. It is never a question. It stops the workflow on its own.

- `review.json` is `[]`: the workflow continues.
- `review.json` has one or more findings: the workflow stops and the maintainer gets the ball.

Every finding carries `maintainer_rejected`. The reviewer always writes it as `null`. Only the orchestrator fills it, with `{ "reason": "..." }`, after the maintainer rejects that finding.
A rejection belongs to the review that carried it. A later review pass regenerates everything from scratch and can raise the same finding again.

Review format is [review.json](.fleet/templates/review.json).

## Orchestrator

- Do not edit product code, except for a non-functional chore explicitly requested by the maintainer during the final human review.
- Do not invent work. Create a story only from the current maintainer discussion.
- Create one story for one reversible change. A change to the data model and a change to behaviour belong to two stories, so each one can be rolled back on its own.
- Define direct, falsifiable probes before creating a story.
- When a decision belongs to the maintainer, report it and wait. Never decide in place of the maintainer.
- Launch and supervise every worker and reviewer. Report only observed process state and recorded handoffs to the maintainer.
- On dirty or uncommitted launch base, tell the maintainer to commit the intended story, prototype, and workflow files, or to remove the unwanted changes. Wait for a clean base before you launch an agent.

### Launch an agent

Every agent runs in its own branch and worktree, and starts from committed state. Uncommitted files are not copied.

Call the `subagent` tool with `cwd` set to the absolute worktree path, `isolation: "none"`, `context: "fresh"`, and `async: false`. The call blocks until the child ends, so its completion is a first class result instead of a string parsed from terminal output. Do not run `pi` from the shell.

Every spawn instruction states the story id, the absolute path of the assigned worktree, which is the agent's root, and that the agent must read `AGENTS.md`, `AGENTS_CONTRIBUTING.md`, and `.fleet/stories/<id>.md` at the start of every pass. Everything else is already in `.pi/agents/`. Do not restate the role in the prompt and do not weaken it.

### Launch a worker

Check that the base is clean, then create the worktree from `HEAD`:

```sh
git worktree add -b worker/<id> .worktree/<id> HEAD
```

Install the dependencies in it.

```sh
npm --prefix <worktree path> ci
```

If the install fails, report it to the maintainer and do not spawn.

Spawn `agent: "fleet-worker"`.

The instruction adds one read to the standard list when the pass is not the first:

- A repair pass reads `.fleet/handoffs/<id>.review.json` after the story.
- A pass resumed after a gate reads the resolved gate named in the instruction, after the story.

### Launch a reviewer

Create one branch and one dedicated clean worktree for each review pass, at the current `worker/<id>` commit:

```sh
git worktree add -b reviewer/<id>/<n> .worktree/<id>-review-<n> worker/<id>
```

`<n>` is a new review sequence number.

Install the dependencies in it.

```sh
npm --prefix <worktree path> ci
```

If the install fails, report it to the maintainer and do not spawn.

Spawn `agent: "fleet-reviewer"`.

### Supervise an agent

- Wait on the subagent. The runtime reports its completion. There is no exit file, no process check, and no polling loop.
- The agent is `running` until the runtime returns it. A quiet subagent, a long pause, or no intermediate message all mean `running with no new observation`. None of them means `dead`. Never report a running agent as terminated.
- Do not spawn a second agent to ask about the first one.
- When the subagent returns, inspect its worktree for the terminal handoff of the current pass. The handoff is the report.
- Confirm that the worktree is clean and that the handoff is committed.
- If the subagent returns without a terminal handoff for the current pass, report the exception to the maintainer and stop. Do not change the repository or relaunch automatically.
- The terminal handoff decides the next step. See [Handoffs](#handoffs).

### After findings

Findings are evidence, not a question. The maintainer reads them and makes one of three decisions. Follow it.

- **The finding is not valid.** Write `maintainer_rejected` with the reason into that finding, in the `review.json` that carries it, and commit it on the reviewer branch. That commit is the candidate commit and the technical story is complete.
- **The code is wrong and the story is right.** Bring the findings to the worker branch.
  ```sh
  git -C .worktree/<id> merge --ff-only reviewer/<id>/<n>
  ```

  Then run the pipeline again.
- **The story is wrong.** Stop. The maintainer rewrites the story and commits it. The work starts again from a new worker branch on the new base commit.

### The candidate commit

The candidate commit is the technical approval stamp. It is the last reviewer commit whose `review.json` is `[]`, or whose every finding carries a `maintainer_rejected` reason.

### Final maintainer review

Declare the technical story completed when a candidate commit exists. On the base branch, run `git merge --squash <candidate-commit>`. Do not commit the merge result. The candidate product changes must remain staged for the maintainer. Keep every worktree until the maintainer makes the final commit.

The maintainer reviews code quality on the base branch. If satisfied, the maintainer commits and pushes the candidate change.

If the maintainer requests a non-functional chore, the orchestrator applies it directly on the base branch. It must not change acceptance criteria, probes, `red_when` breakages, tests, or functional behaviour. It runs the complete existing test suite for each affected workspace as a regression check, stages the chore changes, then returns the staged change to the maintainer for another final review. These tests are not a replacement for independent acceptance verification.

## Worker

The worker role is defined in [.pi/agents/fleet-worker.md](.pi/agents/fleet-worker.md). A worker follows the shared rules in this file and the role instructions in that definition.

## Reviewer

The reviewer role is defined in [.pi/agents/fleet-reviewer.md](.pi/agents/fleet-reviewer.md). A reviewer follows the shared rules in this file and the role instructions in that definition. Reviewers are independent in their evidence generation and code ownership, but informed by the build and earlier review handoffs for the current story.

## Helpers

Use these scripts to write standard files. The build and review scripts overwrite the handoff of the current pass. `open-gate.sh` never overwrites: it takes the next free number.

```sh
scripts/fleet/new-story.sh <id>
scripts/fleet/open-gate.sh <id>   # numbers the gate for you
scripts/fleet/record-build.sh <id>
scripts/fleet/record-review.sh <id>
```

