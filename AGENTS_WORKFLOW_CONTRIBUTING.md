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
- The orchestrator makes every commit needed by the workflow except the final one that occurs once the story is declared completed.
- The maintainer makes the final commit.

## Files and scope

- `.fleet/history/` contains source requests and maintainer decisions. It is the only source of new work.
- `.fleet/stories/<id>.md` is the work order for one reversible change.
- `.fleet/handoffs/` contains build records, gates, and review findings.
- `.fleet/designs/` contains one standalone HTML prototype for each frontend story.
- Read the assigned story at the start of every pass.
- Work in the assigned worktree only.
- Change only the paths listed in the story. Do not widen the list.
- A frontend story must list `.fleet/designs/<id>.html` in its allowed paths. The orchestrator creates the prototype during story preparation. It must be present before the worker starts implementation.
- Never delete branches, worktrees, or files that you did not create.

## Stories

An orchestrator creates stories from `.fleet/history/`. A story must contain:

- Problem
- Constraints
- Allowed paths
- A Design section with `.fleet/designs/<id>.html` for frontend stories
- Acceptance criteria
- Out of scope work

Each acceptance criterion must use this form:

```text
AC<n>: <claim>
probe: <exact command>
postcondition: <observable state>
red_when: <specific breakage that makes the probe fail>
```

Do not edit a story's acceptance criteria, constraints, allowed paths, or out of scope section. Open a gate if any of them is wrong, incomplete, or impossible.

Probes must observe the real effect. Do not accept a probe that reads a mock, write response, exit code, log line, filename, or another substitute for the claimed result. After a write, re read through a separate call. Assert both rejection and unchanged state when the criterion requires both.

## Orchestrator

- Do not edit product code.
- Do not invent work. Create a story only from a file in `.fleet/history/` or a recorded maintainer discussion.
- Create one story for one reversible change. Split changes that mix data model changes with behaviour changes.
- Define direct, falsifiable probes before creating a story.
- Open a gate when a decision belongs to the maintainer.
- Launch and supervise every worker and reviewer. Report only observed process state and recorded handoffs to the maintainer.
- Do not open a gate for a dirty or uncommitted launch base. This is a launch precondition failure. Tell the maintainer to commit the intended workflow files or remove unwanted changes, then refer to `CONTRIBUTING.md`.

### Launch a worker

After creating a story, the maintainer must commit the story and all workflow files that the worker must read, including `.codex/agents/`. The orchestrator creates `.worktree/<id>` from the current committed `HEAD`; uncommitted files are not copied.

The orchestrator checks that the base is clean, then creates the worktree directly:

```sh
git worktree add -b fleet/<id> .worktree/<id> HEAD
```

The orchestrator then spawns the `fleet-worker` subagent defined in `.codex/agents/worker.toml`. Do not shell out to `codex exec`. The runtime owns the child's lifecycle, so its completion is a first class result instead of a string parsed from terminal output.

The spawn instruction must state:

- The story id.
- The absolute path of the assigned worktree, which is the worker's root.
- That the worker must read `AGENTS.md` and `AGENTS_WORKFLOW_CONTRIBUTING.md` first, then `.fleet/stories/<id>.md` at the start of every pass.

Everything else the worker needs is already in `.codex/agents/worker.toml`. Do not restate the role in the prompt and do not weaken it.

If the running session cannot spawn a custom agent by name and only exposes a generic subagent, copy the `developer_instructions` from `.codex/agents/worker.toml` into the spawn instruction verbatim. Tell the maintainer that you had to do this.

### Supervise a worker

- Wait on the subagent. The runtime reports its completion. There is no exit file, no process check, and no polling loop.
- The worker is `running` until the runtime returns it. A quiet subagent, a long pause, or no intermediate message all mean `running with no new observation`. None of them means `dead`.
- Do not spawn a second agent to ask about the first one.
- When the subagent returns, inspect the assigned worktree for exactly one terminal handoff: `.fleet/handoffs/<id>.build.json` or `.fleet/handoffs/<id>.gate.json`. The handoff is the report. The subagent's closing message is not.
- After a `done` build handoff, commit the worker changes before launching a reviewer. The reviewer requires a clean worktree at that commit.
- If the subagent returns and neither terminal handoff exists, write `.fleet/handoffs/<id>.orchestrator-incident.json` in the assigned worktree. This is an orchestrator observation, not a simulated worker report. Include the story id, role, the spawn instruction, how the subagent ended, its last observed step, and the missing handoffs.
- Never write an incident handoff while the subagent is still running. Reporting a running worker as dead is a supervision error, not a worker failure.
- Treat an incident handoff as a failed worker execution. Do not relaunch automatically. Report it to the maintainer and wait for direction.

If the base is dirty, tell the maintainer to fix it. Open a gate only when the story itself needs a maintainer decision.

## Worker

The worker role and its terminal handoff format are defined in `.codex/agents/worker.toml`. A worker follows the shared rules in this file and the role instructions in that definition.

## Reviewer

The reviewer role and its finding format are defined in `.codex/agents/reviewer.toml`. A reviewer follows the shared rules in this file and the role instructions in that definition. The orchestrator creates the reviewer worktree and spawns the `fleet-reviewer` subagent with the same supervision and incident handoff rules used for a worker.

## Gates

Stop immediately when a maintainer decision is required. Write `.fleet/handoffs/<id>.gate.json` with:

```json
{
  "id": "...",
  "decision_so_far": "...",
  "blocked": "...",
  "options": ["..."],
  "recommendation": "...",
  "next_steps": { "option": "..." }
}
```

The gate must let the maintainer decide without reopening the work. Do not wait in process after writing it.

## Helpers

Use these scripts to create standard files. They refuse to overwrite existing files.

```sh
scripts/fleet/new-story.sh <id>
scripts/fleet/open-gate.sh <id>
scripts/fleet/record-build.sh <id>
```
