# <id>: <short title>

## Problem

Describe the requested change.

## Constraints

- No new dependencies.

## Allowed paths

- `path/allowed-by-this-story`
- `.fleet/stories/<id>.evidence.md` (required workflow artefact)
- `.fleet/handoffs/<id>.build.json` (required workflow artefact)
- `.fleet/handoffs/<id>.review.json` (required workflow artefact)
- `.fleet/handoffs/<id>.gate.json` (required workflow artefact)
- `.fleet/handoffs/<id>.gate.superseded.json` (required workflow artefact)
- `.fleet/handoffs/<id>.orchestrator-incident.json` (required workflow artefact)
- `.fleet/designs/<id>.html` (required for frontend stories)

## Frontend prototype design

For a frontend story, add the required standalone HTML prototype at `.fleet/designs/<id>.html`. It shows the intended visual result and does not need to be functional.

## Technical details

Describe the agreed implementation approach.

## Acceptance criteria

### AC1: <claim>

- probe: `<exact command>`
- postcondition: <observable result>
- red_when: <specific change that makes the probe fail>

## Out of scope

- &lt; work that must not be done&gt;

