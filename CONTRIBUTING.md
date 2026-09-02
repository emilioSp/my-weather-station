# Contributing workflow

This workflow keeps task instructions, agent handoffs, and review separate.

```mermaid
flowchart TD
    request[Maintainer request or imported issue] --> history[.fleet/history/]
    history --> orchestrator[Orchestrator along with the maintainer create one small story]
    orchestrator --> story[.fleet/stories/id.md]
    story --> setupCommit[Maintainer commits story and workflow files]
    setupCommit --> worker[Worker implements the story]
    worker --> build[.fleet/handoffs/id.build.json]
    build --> workerCommit[Orchestrator commits worker changes]
    workerCommit --> reviewOne[Independent reviewer runs every probe]
    reviewOne --> reviewRecordOne[.fleet/handoffs/id.review.json]
    reviewRecordOne --> reviewCommitOne[Orchestrator commits reviewer handoff]
    reviewCommitOne --> firstResult{Findings?}
    firstResult -->|Yes| fix[Worker resolves the findings]
    fix --> fixCommit[Orchestrator commits the fix]
    fixCommit --> reviewTwo[New independent review]
    reviewTwo --> reviewRecordTwo[.fleet/handoffs/id.review.json]
    reviewRecordTwo --> reviewCommitTwo[Orchestrator commits reviewer handoff]
    reviewCommitTwo --> secondResult{Findings?}
    firstResult -->|No| complete[Orchestrator declares technical story complete]
    secondResult -->|No| complete
    secondResult -->|Yes| gate[.fleet/handoffs/id.gate.json]
    gate --> decision{Maintainer accepts the finding?}
    decision -->|No| complete
    decision -->|Yes| fix
    complete --> toBase[Orchestrator squash-merges candidate commit to base]
    toBase --> inspect[Maintainer reviews code quality]
    inspect -->|Satisfied| finalCommit[Maintainer commits and pushes]
    inspect -->|Chore requested| chore[Orchestrator applies non-functional chore]
    chore --> regression[Orchestrator runs existing regression tests]
    regression --> inspect
```

## Workflow usage

1. Add one request to `.fleet/history/`.
2. Turn it into one small story. Define its allowed paths and acceptance criteria. Every story must explicitly include its evidence and handoff paths in the allowed paths.
3. For a frontend story, include `.fleet/designs/<id>.html` in the allowed paths and add it as the Design prototype. The orchestrator creates the standalone HTML prototype for each frontend story. It shows the intended visual result and does not need to be functional.
4. The maintainer commits the story and workflow files. Workers start from the committed `HEAD`; uncommitted files are not included in their worktree.
5. A worker implements the story and records the build handoff. The orchestrator commits the worker changes so the reviewer has a clean worktree at the candidate commit.
6. A newly spawned, different reviewer regenerates the checks and records its findings. The orchestrator commits the reviewer handoff immediately. If it finds an issue, the worker resolves it. The orchestrator commits the repair before a newly spawned, different reviewer runs a fresh review.
7. If the second review has no findings, the orchestrator declares the technical story completed. If it still finds issues, it opens a gate. The maintainer can reject the finding and continue to the final review, or accept it and send the worker to another repair and independent review.
8. On the base branch, the orchestrator runs `git merge --squash <candidate-commit>` for the last reviewed commit. It does not commit the merge result. The candidate product changes remain staged for the maintainer.
9. The maintainer reviews the generated code on the base branch. If satisfied, the maintainer makes the final commit and pushes it.
10. If the maintainer requests a chore, the orchestrator applies it only when it does not change functional behaviour, acceptance criteria, probes, `red_when` breakages, or tests. The orchestrator runs relevant existing tests as regression checks, stages the chore changes, and returns the staged change to the maintainer for review.

## Outcomes between agents


| Role     | Situation                                                                                | Terminal handoff | Build status   |
| -------- | ---------------------------------------------------------------------------------------- | ---------------- | -------------- |
| Worker   | Implementation is ready for independent review                                           | `build.json`     | `done`         |
| Worker   | The story cannot produce a reviewable candidate because of a technical execution problem | `build.json`     | `failed`       |
| Worker   | A maintainer decision is required                                                        | `gate.json`      | None           |
| Reviewer | The review is complete, with findings or an empty findings array                         | `review.json`    | Not applicable |
| Reviewer | A maintainer decision is required                                                        | `gate.json`      | Not applicable |


### Handoff examples

Worker `done`:

```json
{
  "id": "temperature-units",
  "branch": "fleet/temperature-units",
  "status": "done",
  "acs": [{ "ac": "AC1", "probe": "npm test", "red_ok": true, "green_ok": true }],
  "notes": ""
}
```

Worker `failed`:

```json
{
  "id": "temperature-units",
  "branch": "fleet/temperature-units",
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
  "next_steps": { "option": "Continue with the selected unit." }
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

A gate is neither `done` nor `failed`. It has no build status because the pass stops for a maintainer decision. A reviewer never has a build status and never issues a pass or fail verdict.

No agent may approve its own work. A passing check must be able to fail when the specified breakage is introduced. The regression checks after a maintainer chore do not replace independent acceptance verification.

## The folders


| Location            | Purpose                                          | Created by                            |
| ------------------- | ------------------------------------------------ | ------------------------------------- |
| `.fleet/history/`   | Source requests and known constraints            | Maintainer or imported document       |
| `.fleet/stories/`   | A clear work order with direct acceptance probes | Orchestrator + Maintainer             |
| `.fleet/handoffs/`  | Build records, reviewer findings, and blockers   | Worker, reviewer, or orchestrator     |
| `.fleet/designs/`   | Standalone HTML prototypes for frontend stories  | Orchestrator during story preparation |
| `.fleet/templates/` | Starting files for stories and handoffs          | Repository                            |
| `.fleet/examples/`  | A small reference story                          | Repository                            |


