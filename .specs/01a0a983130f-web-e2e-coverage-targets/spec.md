# 01a0a983130f-web-e2e-coverage-targets: Web E2E branch coverage target

## Problem

The web workspace reaches 70.52% global branch coverage. Add end-to-end tests for the missing weather-station user paths and reach 75% branch coverage.

## Constraints

- No new dependencies.
- Do not change production code, application behaviour, package scripts, coverage configuration, coverage thresholds, or coverage merge utilities.
- Change Playwright tests only.
- Mock only browser requests to the Supabase REST and RPC endpoints.
- Keep tests deterministic. Do not call a real Supabase service.
- Record JavaScript coverage for every new test case with the existing coverage utility.

## Allowed paths

- `packages/web/e2e/**/*.spec.ts`
- `.specs/01a0a983130f-web-e2e-coverage-targets/**`

## Technical details

Before the builder starts, the owner commits the configured branch threshold at 75%.

Use `packages/web/coverage/coverage-final.json` to select uncovered branch outcomes. Add one `weather-station-branches.spec.ts` Playwright suite. It must cover these user paths with browser request mocks:

- current-reading failure, chart-history failure, and no available readings
- refresh when readings change and when they do not change
- chart zoom controls at both limits and after a range change
- opening and closing the Indoor accordion

Each test must assert the visible result or the relevant accessible state. Do not add coverage-only interactions that lack a user assertion.

## Acceptance criteria

### AC1: The web test command reaches 75% global branch coverage.

- probe: `npm run test -w @wx/web`
- postcondition: Vitest and Playwright succeed. The final merged coverage summary reports at least 75% branches and meets every other configured threshold.
- breakage: temporarily skip every test in `packages/web/e2e/weather-station-branches.spec.ts`; the probe fails its branch coverage threshold.

### AC2: The E2E suite covers weather-station error, empty, refresh, range, and accordion paths.

- probe: `npm exec --workspace @wx/web -- playwright test e2e/weather-station-branches.spec.ts`
- postcondition: Browser assertions show the current-reading error, chart-history error, empty readings, changed and unchanged refresh results, both chart zoom limits, a range request after zoom, and Indoor accordion `aria-expanded` changing from `false` to `true` and back to `false`.
- breakage: temporarily replace the expected current-reading error text in `weather-station-branches.spec.ts`; the probe fails.

## Out of scope

- Coverage merge or source-map changes.
- Production-code changes.
- Unit tests.
- Coverage-target changes.
- Real Supabase calls.
- Visual redesigns.
