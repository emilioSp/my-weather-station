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

## Files and scope

- `.fleet/history/` contains source requests and maintainer decisions. It is the only source of new work.
- `.fleet/stories/<id>.md` is the work order for one reversible change.
- `.fleet/handoffs/` contains build records, gates, and review findings.
- Read the assigned story at the start of every pass.
- Work in the assigned worktree only.
- Change only the paths listed in the story. Do not widen the list.
- Never delete branches, worktrees, or files that you did not create.

## Stories

An orchestrator creates stories from `.fleet/history/`. A story must contain:

- Problem
- Constraints
- Allowed paths
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
- If the subagent returns and neither terminal handoff exists, write `.fleet/handoffs/<id>.orchestrator-incident.json` in the assigned worktree. This is an orchestrator observation, not a simulated worker report. Include the story id, role, the spawn instruction, how the subagent ended, its last observed step, and the missing handoffs.
- Never write an incident handoff while the subagent is still running. Reporting a running worker as dead is a supervision error, not a worker failure.
- Treat an incident handoff as a failed worker execution. Do not relaunch automatically. Report it to the maintainer and wait for direction.

If the base is dirty, tell the maintainer to fix it. Open a gate only when the story itself needs a maintainer decision.

## Worker

The spawn definition is `.codex/agents/worker.toml`. This section is the canonical rule set; the definition must not contradict it.

- Implement exactly the assigned story.
- Respect all story constraints, including dependencies, performance, security, and permitted error content.
- Do not present your checks as verification. They are builder evidence for the reviewer to regenerate.
- For every acceptance criterion, apply the stated `red_when` breakage, run the probe, restore the code, and run the probe again.
- Record both command outputs in `.fleet/stories/<id>.evidence.md`.
- For migrations, execute the reverse path at least once before reporting.
- Write `.fleet/handoffs/<id>.build.json` before ending the pass:

```json
{
  "id": "...",
  "branch": "...",
  "status": "done | gated | failed",
  "acs": [
    { "ac": "AC1", "probe": "...", "red_ok": true, "green_ok": true }
  ],
  "notes": "Every assumption not stated by the story."
}
```

`failed` is a valid result. Do not weaken checks, disable tests, increase timeouts, add retries, suppress errors, or change acceptance criteria to produce green.

## Reviewer

The spawn definition is `.codex/agents/reviewer.toml`. This section is the canonical rule set; the definition must not contradict it.

- Do not review code you wrote.
- Use a clean worktree at the pull request HEAD. Install dependencies from scratch when required.
- The orchestrator creates the reviewer worktree and spawns the `fleet-reviewer` subagent defined in `.codex/agents/reviewer.toml`. Apply the same supervision and incident handoff rules used for a worker.
- Do not read `.fleet/stories/<id>.evidence.md`.
- Bring up real dependencies. Do not use a stand in for the boundary under test.
- Independently run every probe and every `red_when` breakage.
- For schema changes, apply, roll back, and apply again.
- Check each story constraint separately.
- Write findings to stdout as JSON only. Do not issue a pass or fail verdict:

```json
[
  {
    "ac": "AC1",
    "severity": "high | medium | low",
    "confidence": 0.0,
    "evidence": "Executed command and observed output"
  }
]
```

The reviewer may review a story twice. If the second review still has findings, open a gate for the maintainer.

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
