# <id>: <short title>

## Problem

Describe the requested change.

## Constraints

- No new dependencies.

## Allowed paths

- `path/allowed-by-this-story`
- `.fleet/**` (required workflow artefacts)

## Design

For a frontend story, add the required standalone HTML prototype at `.fleet/designs/<id>.html`. It shows the intended visual result and does not need to be functional. Remove this section for a story with no frontend change.

## Technical details

Describe the agreed implementation approach.

## Acceptance criteria

### AC1: <claim>

- probe: `<exact command>`
- postcondition: <observable result>
- red_when: <specific change that makes the probe fail>

## Out of scope

- `<work that must not be done>`
