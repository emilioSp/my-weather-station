# 01a0aabe8baa-e2e-testid-locators: E2E test-id locators

## Problem

The weather-station E2E tests use DOM traversal, Recharts class selectors, text, labels, and roles to select application surfaces. Adopt the project test-id locator methodology for these test suites.

## Constraints

- No new dependencies.
- Do not change application behaviour, visible text, accessible names, package scripts, coverage configuration, or coverage utilities.
- Do not add or remove test scenarios.
- Keep JavaScript coverage capture in every existing E2E test.
- Use `data-testid` only as a stable E2E selector contract. A test id must not include visible text.
- Keep role and attribute assertions when they verify an accessibility contract. Do not use role, label, text, CSS, XPath, or `document.querySelector` to select an application surface in the two target E2E suites.

## Allowed paths

- `packages/web/e2e/weather-station.spec.ts`
- `packages/web/e2e/temperature-units.spec.ts`
- `packages/web/components/primitives/Accordion.tsx`
- `packages/web/components/weather-station/CurrentReadings.tsx`
- `packages/web/components/weather-station/LinearChart.tsx`
- `packages/web/components/weather-station/MeasurementHistory.tsx`
- `packages/web/components/weather-station/MeterAccordion.tsx`
- `packages/web/components/weather-station/RangeControls.tsx`
- `packages/web/components/weather-station/WeatherCard.tsx`
- `packages/web/components/weather-station/WeatherStationHeader.tsx`
- `packages/web/components/weather-station/WeatherStationStatus.tsx`
- `.specs/01a0aabe8baa-e2e-testid-locators/**`

## Technical details

Add stable test ids for every application surface selected in the two target suites. Cover the weather-station status, current readings, measurement history, temperature-unit controls, refresh control, weather cards, range controls, accordion controls, chart plots, chart tooltips, and mobile chart readouts.

Replace each application-surface selector in the target E2E suites with `page.getByTestId()` or a descendant `getByTestId()`. Keep assertions for text, radio state, disabled state, and `aria-expanded` on the selected test-id locator.

For the touch chart test, dispatch touch events through the chart test-id locator. Do not traverse the DOM or query it inside `page.evaluate()`.

## Acceptance criteria

### AC1: The weather-station and temperature-unit E2E suites use stable test-id locators.

- probe: `npm exec --workspace @wx/web -- playwright test e2e/weather-station.spec.ts e2e/temperature-units.spec.ts`
- postcondition: Both suites pass. Every application surface they select has a matching `data-testid` in the rendered app. The suites contain no CSS, XPath, or document DOM queries for application surfaces.
- breakage: temporarily remove the outdoor temperature chart `data-testid`; the probe fails when the chart test cannot locate its surface.

### AC2: Test-id migration preserves the existing user and accessibility assertions.

- probe: `npm run test -w @wx/web`
- postcondition: The web test command succeeds with its existing coverage result. The E2E tests still assert visible text, radio checked state, disabled controls, and accordion `aria-expanded` state through test-id locators.
- breakage: temporarily replace the Indoor accordion test id in `weather-station.spec.ts`; the probe fails.

## Out of scope

- New user scenarios.
- Production behaviour changes.
- Changes to test coverage targets.
- Changes to E2E tests outside the two target suites.
- Test ids outside the application surfaces selected by the two target suites.
