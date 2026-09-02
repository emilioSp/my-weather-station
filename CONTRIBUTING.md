# Contributing workflow

This workflow keeps task instructions, agent handoffs, and review separate.

```mermaid
flowchart TD
    request[Maintainer request or imported issue] --> history[.fleet/history/]
    history --> orchestrator[Orchestrator along with the maintainer create one small story]
    orchestrator --> story[.fleet/stories/id.md]
    story --> commit[Commit story and workflow files]
    commit --> worker[Worker implements the story]
    worker --> build[.fleet/handoffs/id.build.json]
    build --> workerCommit[Orchestrator commits worker changes]
    workerCommit --> reviewOne[Independent reviewer runs every probe]
    reviewOne --> reviewRecordOne[.fleet/handoffs/id.review.json]
    reviewRecordOne --> firstResult{Findings?}
    firstResult -->|No| complete[Orchestrator declares story complete]
    firstResult -->|Yes| fix[Worker resolves the findings]
    fix --> fixCommit[Orchestrator commits the fix]
    fixCommit --> reviewTwo[Second independent review]
    reviewTwo --> secondResult{Findings?}
    secondResult -->|No| complete
    secondResult -->|Yes| gate[.fleet/handoffs/id.gate.json]
    complete --> inspect[Maintainer checks the generated code and makes the final commit]
    gate --> decision[Maintainer makes the decision]
```

## Workflow usage

1. Add one request to `.fleet/history/`.
2. Turn it into one small story. Define its allowed paths and acceptance criteria. 
3. For a frontend story, include `.fleet/designs/<id>.html` in the allowed paths and add it as the Design prototype. The orchestrator creates the standalone HTML prototype for each frontend story. It shows the intended visual result and does not need to be functional.
4. Commit the story and workflow files. Workers start from the committed `HEAD`; uncommitted files are not included in their worktree. 
5. A worker implements the story and records the build handoff.
6. The orchestrator commits worker changes so the reviewer has a clean worktree at the candidate final commit.
7. A different reviewer regenerates the checks and writes findings.
8. If review finds no issue, the orchestrator declares the story complete. If it finds an issue, the worker resolves it. The orchestrator commits the fix before a different reviewer runs one more review round.
9. If the second review has no findings, the orchestrator declares the story complete. If it still finds issues, stop and ask the maintainer through a gate handoff.
10. After the story is complete, the maintainer checks the generated code and makes the final commit.

No agent may approve its own work. A passing check must be able to fail when the specified breakage is introduced.

## The folders


| Location            | Purpose                                          | Created by                            |
| ------------------- | ------------------------------------------------ | ------------------------------------- |
| `.fleet/history/`   | Source requests and known constraints            | Maintainer or imported document       |
| `.fleet/stories/`   | A clear work order with direct acceptance probes | Orchestrator + Maintainer                          |
| `.fleet/handoffs/`  | Build records, reviewer findings, and blockers   | Worker or reviewer                    |
| `.fleet/designs/`   | Standalone HTML prototypes for frontend stories  | Orchestrator during story preparation |
| `.fleet/templates/` | Starting files for stories and handoffs          | Repository                            |
| `.fleet/examples/`  | A small reference story                          | Repository                            |
