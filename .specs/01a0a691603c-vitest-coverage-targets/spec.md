# 01a0a691603c-vitest-coverage-targets: Vitest coverage targets

## Problem

The Vitest coverage run fails in collector, shared, and web. Each workspace must meet its existing global coverage thresholds without changing those thresholds or their inclusion rules.

## Constraints

- No new dependencies.
- Do not change Vitest configuration, package scripts, coverage thresholds, or coverage inclusion and exclusion rules.
- Do not change production behaviour or production source files.
- Add only Vitest unit tests. Do not change Playwright tests.
- Keep tests deterministic.
- Use the local Supabase PostgreSQL instance. Do not mock Knex, PostgreSQL, or the Supabase client in tests of database access.
- Before a database test run, reset the local Supabase database and apply the collector Knex migrations.
- Each database test must remove the data it creates, including when its assertion fails.
- Mock the Bluetooth boundary through `sensor.api.ts` and Noble. No test may require Bluetooth hardware.

## Allowed paths

- `package.json`
- `packages/collector/**/*.test.ts`
- `packages/shared/**/*.test.ts`
- `packages/web/**/*.test.ts`
- `.specs/01a0a691603c-vitest-coverage-targets/**`

## Technical details

Use `npm run supabase:start` and `npm run supabase:reset` to manage the local Supabase instance. Apply the collector migrations after each reset.

Add focused Vitest tests for executable modules already selected by each workspace's coverage configuration. Exercise normal results, boundary values, and failure paths needed to meet the current global thresholds.

Collector tests cover these cases:

- `measure.repository.ts` stores a complete measure in local PostgreSQL, returns its camel-case stored row, and leaves `measures` empty after the test.
- `Meter`, `IndoorMeter`, and `OutdoorMeter` read complete, incomplete, valid, and invalid advertisements. They use the real measure repository and local database, while mocking `sensor.api.ts`. The `sensor.api.ts` tests mock Noble.
- `sensor.api.ts` covers a matching device, no matching device, a scan-start failure, and scan timeout cleanup with Noble mocked.
- The meter factory, dew point, heat index, measure formatting, and `NoCompleteReadingError` cover their normal and boundary paths.

Shared tests cover snake-case and camel-case mapping of nested values and arrays, UUID normalization, and valid and invalid values for every exported Zod schema.

Web tests cover temperature utilities and dashboard formatting, range filtering, extrema, downsampling, and signal calculations. The Supabase API tests query the empty local Supabase database through the real client. Tests of hook state and timing may mock the web API module, but not its Supabase API tests or the database layer.

## Acceptance criteria

### AC1: Collector wx meets its configured Vitest coverage thresholds.

- probe: `npm run supabase:start && npm run supabase:reset && npm run migrate:local -w @wx/collector && npm run test -w @wx/collector`
- postcondition: Vitest reports at least 80% statements and lines, and at least 75% branches and functions, for the collector coverage scope. The repository test stores a complete measure in local PostgreSQL, reads back the returned row, and removes its test data.
- breakage: temporarily remove every `*.test.ts` file under `packages/collector/`; the probe fails its coverage thresholds.

### AC2: Shared wx meets its configured Vitest coverage thresholds.

- probe: `npm run test -w @wx/shared`
- postcondition: Vitest exits successfully after reporting at least 80% statements and lines, and at least 75% branches and functions, for the shared coverage scope.
- breakage: temporarily remove every `*.test.ts` file under `packages/shared/`; the probe fails its coverage thresholds.

### AC3: Web wx meets its configured Vitest coverage thresholds.

- probe: `npm run supabase:start && npm run supabase:reset && npm run migrate:local -w @wx/collector && npm run test -w @wx/web`
- postcondition: Playwright and Vitest succeed. Vitest reports at least 80% statements and lines, and at least 75% branches and functions, for the web coverage scope. The Supabase API test receives an empty result from the local database through the real client.
- breakage: temporarily remove every `*.test.ts` file under `packages/web/`; the probe fails its coverage thresholds.

## Out of scope

- Raising or lowering coverage thresholds.
- Changing coverage inclusion or exclusion rules.
- Changes to production code or behaviour.
- New test dependencies.
- Changes to end-to-end tests.
- Tests that require Bluetooth hardware.
- Mocks of the database layer or Supabase client in database-access tests.
