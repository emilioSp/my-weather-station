# Agent workflow

This file controls agents that use the `.fleet` workflow. Follow it exactly.

## Non negotiable rules

1. A builder does not verify its own work. A reviewer from a different model family independently regenerates every claim.
2. A probe must touch the claimed result and must fail when its `red_when` breakage is applied.
3. When a requirement is ambiguous, stop and open a gate. Do not guess.
4. The repository is the only persistent state. Write important outcomes to `.fleet/handoffs/` before ending a pass.

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

## Worker

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

- Do not review code you wrote.
- Use a clean worktree at the pull request HEAD. Install dependencies from scratch when required.
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
