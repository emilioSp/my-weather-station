# Contributing workflow

This workflow keeps task instructions, agent handoffs, and review separate.

```mermaid
flowchart TD
    request[Maintainer explains the problem] --> orchestrator[Orchestrator and maintainer create one small story]
    orchestrator --> story[.fleet/stories/id.md]
    story --> setupCommit[Maintainer commits story and workflow files]
    setupCommit --> worker[Worker implements the story]
    worker --> build[.fleet/handoffs/id.build.json]
    worker --> workerGate[Worker writes .fleet/handoffs/id.gate.json]
    workerGate --> workerDecision{Maintainer selects an option}
    workerDecision --> resolvedWorkerGate[Orchestrator records decision and archives gate]
    resolvedWorkerGate --> workerResumed[Worker resumed pass]
    workerResumed --> worker
    build --> workerCommit[Worker commits changes and build handoff]
    workerCommit --> reviewerOneSetup[Orchestrator creates reviewer 1 branch and worktree]
    reviewerOneSetup --> reviewOne[Independent reviewer runs every probe]
    reviewOne --> reviewRecordOne[.fleet/handoffs/id.review.json]
    reviewRecordOne --> reviewCommitOne[Reviewer 1 commits its handoff]
    reviewCommitOne --> firstResult{Findings?}
    firstResult -->|No| reviewerOneNoFindingMerge[Orchestrator fast forward merges reviewer 1 branch into worker branch]
    reviewerOneNoFindingMerge --> complete[Orchestrator declares technical story complete]
    firstResult -->|Yes| firstFinding{Repairable within story?}
    firstFinding -->|Yes| reviewerOneRepairMerge[Orchestrator fast forward merges reviewer 1 branch into worker branch]
    reviewerOneRepairMerge --> fix[Worker resolves the findings]
    firstFinding -->|No| gate[Reviewer writes .fleet/handoffs/id.gate.json]
    fix --> fixCommit[Worker commits the repair and build handoff]
    fixCommit --> reviewerTwoSetup[Orchestrator creates reviewer 2 branch and worktree]
    reviewerTwoSetup --> reviewTwo[Second independent, informed review]
    reviewTwo --> reviewRecordTwo[.fleet/handoffs/id.review.json]
    reviewRecordTwo --> reviewCommitTwo[Reviewer 2 commits its handoff]
    reviewCommitTwo --> secondResult{Findings?}
    secondResult -->|No| complete
    secondResult -->|Yes| gate
    gate --> decision{Maintainer accepts the finding?}
    decision -->|No| exceptionCandidate[Orchestrator records rejected finding in superseded gate, which becomes the candidate commit]
    exceptionCandidate --> complete
    decision -->|Yes| resolvedGate[Orchestrator records decision and archives gate]
    resolvedGate --> resolvedReviewerMerge[Orchestrator fast forward merges the resolved reviewer branch into worker branch]
    resolvedReviewerMerge --> newCycle[Worker resumed pass and new review cycle]
    newCycle --> reviewerOneSetup
    complete --> toBase[Orchestrator squash-merges candidate commit to base]
    toBase --> inspect[Maintainer reviews code quality]
    inspect -->|Satisfied| finalCommit[Maintainer commits and pushes]
    inspect -->|Chore requested| chore[Orchestrator applies non-functional chore]
    chore --> regression[Orchestrator runs existing regression tests]
    regression --> inspect
```

## Workflow usage

1. The maintainer explains the problem to the orchestrator. They can discuss options and constraints. The outcome is one small story with allowed paths and acceptance criteria. Every story must explicitly include its evidence and handoff paths in the allowed paths.
2. For a frontend story, include `.fleet/designs/<id>.html` in the allowed paths and add it as the Design prototype. The orchestrator creates the standalone HTML prototype for each frontend story. It shows the intended visual result and does not need to be functional.
3. The maintainer commits the story, the frontend prototype when required, and the workflow files. Workers start from the committed `HEAD`; uncommitted files are not included in their worktree. The worker branch is `worker/<id>`. Each reviewer branch is `reviewer/<id>/<n>`, where `<n>` is its review sequence number.
4. A worker implements the story, records the build handoff, and commits its changes and handoff in its dedicated worktree.
5. If a worker opens a gate, the orchestrator reports it to the maintainer. After the maintainer selects an option, the orchestrator records the decision and reason, renames the active gate to `.fleet/handoffs/<id>.gate.superseded.json`, and commits that state on `worker/<id>`. The orchestrator then launches a resumed worker pass in the same worktree. It does not launch a reviewer until the worker commits a `done` build handoff.
6. The orchestrator creates a dedicated reviewer 1 branch and clean worktree from the worker commit. Reviewer 1 regenerates the checks and writes `review.json`. When a maintainer decision is required, it also writes `gate.json`; the gate is then the terminal handoff. It commits the handoff files in the reviewer worktree. If there is no active gate, the orchestrator fast forward merges the reviewer branch into `worker/<id>`. No findings complete the technical story. A repairable finding sends the worker to a repair pass. A finding outside the story requires the reviewer to open a gate. A reviewer branch with an active gate is not merged.
7. After a repair, the worker commits it and its build handoff on `worker/<id>`. The orchestrator then creates a dedicated reviewer 2 branch and clean worktree from that commit. Reviewer 2 sees the previous review and the repair build handoff, regenerates the checks, and writes `review.json`. If a maintainer decision is required, it also writes `gate.json`; the gate is then the terminal handoff. It commits the handoff files in the reviewer 2 worktree. If it has no findings, its handoff commit is the candidate commit and the orchestrator declares the technical story completed. If it finds issues, the reviewer opens a gate. If the maintainer rejects the finding, the orchestrator records `finding_rejected` and the reason in the superseded gate. That commit is an exception candidate commit. If the maintainer accepts the finding, the orchestrator records the decision in the superseded gate, fast forward merges the resolved reviewer branch into `worker/<id>`, then starts a new review cycle with a worker repair and a fresh independent, informed first review. A review cycle has at most two reviews.
8. The candidate commit is either the last reviewer handoff commit whose `review.json` contains `[]`, or an exception candidate commit with a superseded gate whose `resolution.decision` is `finding_rejected`. It is the technical approval stamp. On the base branch, the orchestrator runs `git merge --squash <candidate-commit>`. It does not commit the merge result. The candidate product changes remain staged for the maintainer.
9. The maintainer reviews the generated code on the base branch. If satisfied, the maintainer makes the final commit and pushes it.
10. If the maintainer requests a chore, the orchestrator applies it only when it does not change functional behaviour, acceptance criteria, probes, `red_when` breakages, or tests. The orchestrator runs the complete existing test suite for each affected workspace as a regression check, stages the chore changes, and returns the staged change to the maintainer for review.

## Outcomes between agents


| Role     | Situation                                                                                | Handoff files                 | Build status   |
| -------- | ---------------------------------------------------------------------------------------- | ----------------------------- | -------------- |
| Worker   | Implementation is ready for independent review                                           | `build.json`                  | `done`         |
| Worker   | The story cannot produce a reviewable candidate because of a technical execution problem | `build.json`                  | `failed`       |
| Worker   | A maintainer decision is required                                                        | `gate.json`                   | None           |
| Reviewer | The review is complete, with findings or an empty findings array                         | `review.json`                 | Not applicable |
| Reviewer | A maintainer decision is required                                                        | `review.json` and `gate.json` | Not applicable |


### Handoff examples

Worker `done`:

```json
{
  "id": "temperature-units",
  "branch": "worker/temperature-units",
  "status": "done",
  "acs": [{ "ac": "AC1", "probe": "npm test", "red_ok": true, "green_ok": true }],
  "notes": ""
}
```

Worker `failed`:

```json
{
  "id": "temperature-units",
  "branch": "worker/temperature-units",
  "status": "failed",
  "acs": [{ "ac": "AC1", "probe": "npm test", "red_ok": true, "green_ok": false }],
  "notes": "AC1: npm test exited 1 because the required service was unavailable."
}
```

Worker or reviewer gate:

```json
{
  "id": "temperature-units",
  "decision_so_far": "No implementation started.",
  "blocked": "The story does not define the fallback unit.",
  "options": ["celsius", "fahrenheit"],
  "recommendation": "celsius",
  "next_steps": { "option": "Continue with the selected unit." },
  "resolution": null
}
```

Reviewer finding. Use `[]` when the reviewer has no findings:

```json
[
  {
    "ac": "AC1",
    "severity": "medium",
    "confidence": 0.9,
    "evidence": "npm test passed, but the red_when breakage also passed."
  }
]
```

A gate is neither `done` nor `failed`. It has no build status because the pass stops for a maintainer decision. A reviewer never has a build status and never issues a pass or fail verdict. A reviewer always writes `review.json`; when a maintainer decision is required, it writes `gate.json` after the review record. The gate is the terminal handoff.

Each role overwrites the handoff for its current pass at the fixed story path. Historical handoffs from earlier roles or passes remain in Git history and are not active. After the maintainer resolves a gate, the orchestrator records the decision and reason, renames `.fleet/handoffs/<id>.gate.json` to `.fleet/handoffs/<id>.gate.superseded.json`, and commits the change before it launches a resumed pass. The superseded gate records the resolved blocker but is not terminal. A reviewer writes `[]` when it has no findings.

No agent may approve its own work. A passing check must be able to fail when the specified breakage is introduced. The regression checks after a maintainer chore do not replace independent acceptance verification.

## The folders


| Location            | Purpose                                          | Created by                            |
| ------------------- | ------------------------------------------------ | ------------------------------------- |
| `.fleet/stories/`   | A clear work order with direct acceptance probes | Orchestrator + Maintainer             |
| `.fleet/handoffs/`  | Build records, reviewer findings, and blockers   | Worker, reviewer, or orchestrator     |
| `.fleet/designs/`   | Standalone HTML prototypes for frontend stories  | Orchestrator during story preparation |
| `.fleet/templates/` | Starting files for stories and handoffs          | Repository                            |
| `.fleet/examples/`  | A small reference story                          | Repository                            |
