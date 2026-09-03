# <id>: <short title>

## Problem

Describe the requested change.

## Constraints

- No new dependencies.

## Allowed paths

- `path/allowed-by-this-story`
- `.fleet/**` (required workflow artefacts)

## Design

Add a standalone HTML prototype at `.fleet/designs/<id>.html` when the story introduces a visual surface that has no existing reference. It shows the intended visual result and does not need to be functional.

Remove this section when the story has no prototype. If the story still changes what the user sees, cover the visual result with an acceptance criterion instead, for example:

```text
AC<n>: the page does not scroll horizontally at the smallest target resolution
probe: <playwright test at the smallest target resolution, comparing document.documentElement.scrollWidth with clientWidth>
postcondition: scrollWidth is not greater than clientWidth
red_when: give a fixed width wider than the viewport to a child of the changed container
```

## Technical details

Describe the agreed implementation approach.

## Acceptance criteria

### AC1: <claim>

- probe: `<exact command>`
- postcondition: <observable result>
- red_when: <specific change that makes the probe fail>

## Out of scope

- `<work that must not be done>`
