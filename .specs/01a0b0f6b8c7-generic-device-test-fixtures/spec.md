# 01a0b0f6b8c7-generic-device-test-fixtures: Make dashboard device tests configuration-driven

## Problem

The web tests name the current meters directly. This binds test fixtures and assertions to `garden`, `kitchen`, `living room`, and `bedroom`.

The tests must use configured devices. A device-name change must require configuration changes, not a rewrite of test fixtures.

The E2E request mocks also hide setup in shared helpers. Each test must define its network mocks next to the page navigation or user action that uses them.

## Constraints

- Do not add dependencies.
- Do not change application code, environment files, visual output, or user behaviour.
- Do not change collector code, database code, queries, or migrations.
- Do not change test coverage thresholds.
- Do not use literal real device names in test fixtures or assertions.
- Test names may describe behaviour but must not identify a real device.
- Keep test data clear. Do not create a complex test helper framework.
- Remove `mockWeatherStation`. Do not replace it with another multi-purpose request mock helper.
- Define each E2E `page.route` mock in the test that uses it, immediately before `page.goto()` or the action that triggers the request.

## Allowed paths

- `packages/web/hooks/useWeatherStation.test.ts`
- `packages/web/e2e/weather-station.spec.ts`
- `packages/web/e2e/temperature-units.spec.ts`
- `.specs/01a0b0f6b8c7-generic-device-test-fixtures/**`

## Technical details

In hook tests, mock the configured device list with neutral test names. Build expected calls and name-keyed state from that list. The test must prove that the hook requests every configured name in configuration order.

In E2E tests, derive device names, mocked latest rows, history groups, accordion locators, chart labels, and test IDs from the configured device list. Use a simple local row factory when it makes fixtures clearer.

Keep each request route inside its test. A route may inspect the requested device name, but the response must be selected from test data derived from the configured device list. Keep range-request capture beside the range test.

## Acceptance criteria

### AC1: Hook tests use configured test devices instead of real meter names.

- probe: `npm run test:unit -w @wx/web -- hooks/useWeatherStation.test.ts`
- postcondition: the hook test uses a mocked neutral device list and proves one latest-measure request for every configured name in order. Its name-keyed current state and history use the same list.
- breakage: change one expected latest-measure request to use a name not present in the mocked device list.

### AC2: E2E dashboard fixtures follow the configured device list.

- probe: `npm run test:e2e -w @wx/web -- weather-station.spec.ts temperature-units.spec.ts`
- postcondition: current-reading, history, refresh, accordion, chart, and temperature-unit scenarios use rows and selectors derived from configured devices. The tests pass without literal real meter names in fixture data or assertions.
- breakage: change a configured-name-derived response lookup to return a row for a different configured device.

### AC3: Each E2E test defines its own request mocks.

- probe: `npm run test:coverage -w @wx/web`
- postcondition: `mockWeatherStation` is absent. Each test declares the routes it uses beside navigation or the triggering action. The full web coverage suite passes.
- breakage: remove the latest-measure route from the refresh test.

## Out of scope

- Adding, removing, renaming, or reordering configured devices.
- Changes to meter themes, icons, cards, accordions, charts, or range controls.
- Changes to production configuration validation.
- Changes to application API calls or data handling.
