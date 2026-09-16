# 01a0a983130f-web-e2e-coverage-targets: Web E2E coverage targets

## Problem

The raised global coverage targets fail in the web workspace. Add end-to-end tests that execute the missing weather-station states and meet the configured targets.

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

Extend the existing weather-station Playwright coverage. Cover real user-visible states that the current tests do not execute: latest-reading failure, history failure, no available readings, refresh with changed and unchanged readings, and chart range controls. Use browser route handlers to return the required REST and RPC results.

## Acceptance criteria

### AC1: The web test command meets all configured global coverage targets.

- probe: `npm run test -w @wx/web`
- postcondition: Playwright and Vitest succeed. The final merged coverage summary reports at least 80% statements and lines, and at least 75% branches and functions.
- breakage: temporarily rename every `packages/web/e2e/*.spec.ts` file so Playwright finds no E2E tests; the probe fails.

### AC2: The E2E tests show the weather-station error and empty-data states from mocked API responses.

- probe: `npx playwright test e2e/weather-station-states.spec.ts`
- postcondition: The test asserts the visible current-reading error message, the visible chart-history error message, and both the `No readings yet` header state and `No measurements in this range.` chart state after their matching mocked endpoint responses.
- breakage: temporarily change the current-reading error matcher in `weather-station-states.spec.ts` to a different literal; the probe fails.

### AC3: The E2E tests show refresh and range-control behaviour from mocked API responses.

- probe: `npx playwright test e2e/weather-station-interactions.spec.ts`
- postcondition: The test asserts that refresh updates changed readings, does not replace unchanged readings, and that chart zoom controls change range, disable at the available limits, and request chart data for the selected range.
- breakage: temporarily change the expected changed reading in `weather-station-interactions.spec.ts` to a different value; the probe fails.

## Out of scope

- New product behaviour or production-code changes.
- Unit tests.
- Coverage-target changes.
- Real Supabase calls.
- Visual redesigns.
