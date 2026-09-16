# 01a0a983130f-web-e2e-coverage-targets: Web E2E component branch coverage

## Problem

The web workspace reaches 74.23% global branch coverage. The main remaining gaps are visible states inside weather-station components. Add end-to-end tests for those states and reach 75% branch coverage.

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

Use `packages/web/coverage/coverage-final.json` to select uncovered component branches. Extend `weather-station-branches.spec.ts` with browser assertions for these visible component states:

- `LinearChart`: populated and empty charts, desktop tooltip, and touch tooltip interaction at the smartphone viewport
- `RangeControls`: loading state, minimum zoom limit, maximum zoom limit, and selected range after zoom
- `WeatherCard`: missing reading and weak, medium, and strong signal displays
- `MeterAccordion`: loading placeholders, ready charts, and expanded and collapsed states
- `WeatherStationHeader`: no available reading and refresh in progress

Use browser request mocks to produce each state. Each interaction must assert visible text, button state, or accessible state. Do not add coverage-only interactions that lack a user assertion.

## Acceptance criteria

### AC1: The web test command reaches 75% global branch coverage.

- probe: `npm run test -w @wx/web`
- postcondition: Vitest and Playwright succeed. The final merged coverage summary reports at least 75% branches and meets every other configured threshold.
- breakage: temporarily skip every test in `packages/web/e2e/weather-station-branches.spec.ts`; the probe fails its branch coverage threshold.

### AC2: The E2E suite shows the uncovered weather-station component states.

- probe: `npm exec --workspace @wx/web -- playwright test e2e/weather-station-branches.spec.ts`
- postcondition: Browser assertions show each state in the Technical details section, including a desktop chart tooltip, a smartphone touch chart readout, every signal display, both accordion states, and both zoom limits.
- breakage: temporarily replace the expected `No readings available.` text in `weather-station-branches.spec.ts`; the probe fails.

## Out of scope

- Coverage merge or source-map changes.
- Production-code changes.
- Unit tests.
- Coverage-target changes.
- Real Supabase calls.
- Visual redesigns.
