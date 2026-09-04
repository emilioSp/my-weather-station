# <id>: <short title>

## Problem

Describe the requested change.

## Constraints

- No new dependencies.

## Allowed paths

- `path/allowed-by-this-spec`
- `.specs/**` (required workflow artefacts)

## Prototype

Add a standalone HTML prototype at `.specs/prototypes/<id>.html` when the spec introduces a visual surface that has no existing reference. It shows the intended visual result and does not need to be functional.

Remove this section when the spec has no prototype. If the spec still changes what the user sees, cover the visual result with an acceptance criterion instead, for example:

```text
AC<n>: the page does not scroll horizontally at the smallest target resolution
probe: <playwright test at the smallest target resolution, comparing document.documentElement.scrollWidth with clientWidth>
postcondition: scrollWidth is not greater than clientWidth
breakage: give a fixed width wider than the viewport to a child of the changed container
```

## Technical details

Describe the agreed implementation approach.

## Acceptance criteria

### AC1: <claim>

- probe: `<exact command>`
- postcondition: <observable result>
- breakage: <specific change that makes the probe fail>

## Out of scope

- `<work that must not be done>`
