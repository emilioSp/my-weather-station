# AGENTS_CONTRIBUTING

This file defines the agent workflow for this repository.

## Core rules

1. A different agent verifies each implementation claim.
2. Every check must touch the claimed result and be able to fail on demand.

## Repository state

- Work starts in `.fleet/history/`. It contains imported requests or maintainer discussion notes.
- Read the assigned story from `.fleet/stories/<id>.md` at the start of each pass.
- Write terminal results to `.fleet/handoffs/`.
- Work only in the assigned worktree and only on paths listed in the story.
- Stop and open a gate when a decision, scope change, or ambiguous requirement needs maintainer input.

## Stories

A story is created from `.fleet/history/`. It states the problem, constraints, allowed paths, acceptance criteria, and out-of-scope work.
Each acceptance criterion has a claim, probe, postcondition, and `red_when` breakage.
Do not change the story acceptance criteria.

For every criterion, workers must make the stated breakage, run the probe and record its failure, restore the code, run the probe again, and record the passing result in `.fleet/stories/<id>.evidence.md`.

## Roles

### Orchestrator

- Does not edit product code.
- Creates one reversible story at a time.
- Opens a gate when a story cannot have direct, falsifiable acceptance probes.

### Worker 

- Implements only the assigned story.
- Does not verify their own work.
- Records terminal results in `.fleet/handoffs/<id>.build.json`.

### Reviewer

- Uses a clean worktree and regenerates every probe and `red_when` case.
- Does not read the worker evidence file.
- Emits JSON findings only. Review is limited to two rounds.

## Gates

On a blocker, stop work and write `.fleet/handoffs/<id>.gate.json`. Include the decision so far, blocker, options, recommendation, and next action for each option.

## Prohibited actions

- Do not skip, filter, or disable checks.
- Do not weaken assertions, increase timeouts, or add retries to make checks pass.
- Do not add dependencies unless the story declares them.
- Do not commit generated pipeline artifacts.
- Do not mark your own work as reviewed.

Use `scripts/fleet/new-story.sh`, `open-gate.sh`, and `record-build.sh` to create the standard files.
