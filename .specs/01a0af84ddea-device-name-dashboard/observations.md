# Builder observations

These are builder observations for the verifier to regenerate.

## AC1

Applied the breakage by removing the duplicate-name refinement from `packages/web/environment.ts`.

Command:

```sh
npm run test:unit -w @wx/web -- environment.test.ts
```

Breakage output:

```text
❯ environment.test.ts (5 tests | 1 failed) 3ms
❯ web environment (5)
  × rejects duplicate names 2ms
AssertionError: expected true to be false // Object.is equality
Test Files  1 failed (1)
Tests  4 passed | 1 failed (5)
npm error Lifecycle script `test:unit` failed
```

Restored the refinement.

Command:

```sh
npm run test:unit -w @wx/web -- environment.test.ts
```

Restored output:

```text
Test Files  1 passed (1)
Tests  5 passed (5)
```

## AC2

Applied the breakage by changing the latest query predicate from `device_name` to `device_type` in `packages/web/supabase.api.ts`.

Command:

```sh
npm run migrate:local -w @wx/collector && npm run test:unit -w @wx/web -- supabase.api.test.ts
```

Breakage output:

```text
Already up to date
❯ supabase.api.test.ts (3 tests | 1 failed) 78ms
❯ Supabase API (3)
  × returns configured latest measures in device order
AssertionError: expected [ 'kitchen', 'kitchen' ] to deeply equal [ 'garden', 'kitchen' ]
Test Files  1 failed (1)
Tests  2 passed | 1 failed (3)
npm error Lifecycle script `test:unit` failed
```

Restored the `device_name` predicate.

Command:

```sh
npm run migrate:local -w @wx/collector && npm run test:unit -w @wx/web -- supabase.api.test.ts
```

Restored output:

```text
Already up to date
Test Files  1 passed (1)
Tests  3 passed (3)
```

The migration reverse path was exercised with:

```sh
npm run rollback:local -w @wx/collector && npm run migrate:local -w @wx/collector
```

Output:

```text
Batch 4 rolled back: 1 migrations
Batch 4 run: 1 migrations
```

## AC3

Applied the breakage by replacing the configured current-reading label with the fixed `Indoor` label in `CurrentReadings.tsx`.

Command:

```sh
npm run test:e2e -w @wx/web -- weather-station.spec.ts
```

Breakage output:

```text
Running 9 tests using 1 worker
✘ Weather station › shows configured names and icons and omits missing or unknown history groups
Error: expect(locator).toHaveCount(expected) failed
Locator: getByText('Indoor', { exact: true })
Expected: 0
Received: 2
8 passed (approximately 15s)
npm error Lifecycle script `test:e2e` failed
```

Restored the configured label.

Command:

```sh
npm run test:e2e -w @wx/web -- weather-station.spec.ts
```

Restored output:

```text
Running 9 tests using 1 worker
9 passed (approximately 10s)
```

## AC4

Applied the breakage by keying current rows by `deviceType` instead of configured `deviceName` in `useWeatherStation.ts`.

Command:

```sh
npm run test:unit -w @wx/web -- useWeatherStation.test.ts weather-dashboard.util.test.ts && npm run test:e2e -w @wx/web
```

Breakage output:

```text
Test Files  2 passed (2)
Tests  7 passed (7)
Running 15 tests using 3 workers
6 failed
Error: expect(locator).toContainText(expected) failed
Locator: getByLabel('Current readings')
Expected substring: "68.0°F"
Received string: "gardenNo readings available.kitchenNo readings available."
npm error Lifecycle script `test:e2e` failed
```

Restored name-keyed current rows.

Command:

```sh
npm run test:unit -w @wx/web -- useWeatherStation.test.ts weather-dashboard.util.test.ts && npm run test:e2e -w @wx/web
```

Restored output:

```text
Test Files  2 passed (2)
Tests  7 passed (7)
Running 15 tests using 3 workers
15 passed (approximately 10s)
```

## Final builder checks

```sh
npm run lint
```

```text
Checked 109 files in 19ms. No fixes applied.
```

```sh
npm run build
```

```text
@wx/collector build: tsc
@wx/shared build: tsc
@wx/web build: tsc && vite build --mode prod
✓ built in approximately 1s
```
