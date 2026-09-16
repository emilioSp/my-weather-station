# 01a0a99a6fd8-playwright-coverage-source-map-normalization: Playwright coverage source-map normalization

## Problem

The Playwright coverage collector counts compiler-generated V8 function entries as uncovered application functions after it maps browser JavaScript back to TypeScript source. This makes the web coverage result fail even when the matching component runs.

## Constraints

- No new dependencies.
- Do not change production code, application behaviour, package scripts, coverage thresholds, Vitest configuration, or Playwright test cases.
- Change only the Playwright coverage merge utility.
- Keep real uncovered application functions in the final coverage map.
- Keep the coverage result deterministic.

## Allowed paths

- `packages/web/e2e/utils/merge-coverage.ts`
- `.specs/01a0a99a6fd8-playwright-coverage-source-map-normalization/**`

## Technical details

Normalize the merged Istanbul coverage map before reports and threshold checks run. Remove only an anonymous Vitest function entry when a named Playwright function entry has the same original declaration position. Keep the named entry and keep distinct nested handlers with their counters.

## Acceptance criteria

### AC1: Normalization removes merged source-map duplicates but preserves real uncovered handlers.

- probe: `rm -rf packages/web/coverage && npm exec --workspace @wx/web -- vitest run --coverage --config vitest.config.ts && npm exec --workspace @wx/web -- playwright test && (npm exec --workspace @wx/web -- node e2e/utils/merge-coverage.ts || true) && (cd packages/web && node --input-type=module -e "const { readFile } = await import('node:fs/promises'); const coverage = JSON.parse(await readFile('coverage/coverage-final.json', 'utf8')); const entry = Object.entries(coverage).find(([path]) => path.endsWith('/components/primitives/Accordion.tsx')); if (entry === undefined) throw new Error('Accordion coverage is missing'); const [, data] = entry; const functions = Object.entries(data.fnMap).map(([id, value]) => ({ ...value, count: data.f[id] })); const hasDuplicate = functions.some((anonymous) => anonymous.name.startsWith('(anonymous_') && functions.some((named) => !named.name.startsWith('(anonymous_') && named.decl.start.line === anonymous.decl.start.line && named.decl.start.column === anonymous.decl.start.column)); if (hasDuplicate) throw new Error('Merged source-map duplicate remains'); if (!functions.some((value) => value.name === 'Accordion' && value.count > 0)) throw new Error('Executed component is missing'); if (!functions.some((value) => value.name === 'onClick' && value.count === 0)) throw new Error('Uncovered handler is missing');")`
- postcondition: The final merged coverage artifact has no anonymous function with the same declaration position as a named function. It retains the executed `Accordion` counter and the separate uncovered `onClick` handler counter. The coverage summary is produced for later measurement but its thresholds are not an acceptance criterion.
- breakage: temporarily bypass normalization before reports are written; the probe fails because the merged source-map duplicate remains.

## Out of scope

- New or changed end-to-end tests.
- Production-code changes.
- Changes to coverage targets or coverage configuration.
- Hiding real uncovered functions.
