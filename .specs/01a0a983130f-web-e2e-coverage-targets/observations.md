# Builder observations

## AC1

Breakage: temporarily changed `test.describe` to `test.describe.skip` in `packages/web/e2e/weather-station-branches.spec.ts`.

```sh
npm run test -w @wx/web
```

```text
Running 14 tests using 3 workers
8 skipped
6 passed (5.8s)
Branches: 70.52% (213/302)
Error: branches: 70.52% is below 75%
```

After restoring the suite:

```sh
npm run test -w @wx/web
```

```text
Running 14 tests using 3 workers
14 passed (24.1s)
Statements: 91.67% (1574/1717)
Branches: 75.07% (250/333)
Functions: 90.12% (73/81)
Lines: 98.85% (1463/1480)
```

## AC2

Breakage: temporarily changed the expected `No readings available.` text in `packages/web/e2e/weather-station-branches.spec.ts` to `No readings exist.`.

```sh
npm exec --workspace @wx/web -- playwright test e2e/weather-station-branches.spec.ts
```

```text
1 failed, 7 passed
Locator: getByText('No readings exist.')
Expected: 2
Received: 0
```

After restoring the expected text:

```sh
npm exec --workspace @wx/web -- playwright test e2e/weather-station-branches.spec.ts
```

```text
8 passed (23.9s)
```

The browser assertions cover populated and empty charts, desktop tooltips, the smartphone touch chart readout, loading placeholders, range loading and both limits, changed selected ranges, weak/medium/strong signal values, missing readings, accordion expanded and collapsed state, no available reading, and a disabled refresh button while refreshing. Every test records JavaScript coverage with `saveCoverage`.

## Repository checks

```sh
npm run lint
```

```text
Checked 94 files in 13ms. No fixes applied.
```

```sh
npm run build
```

```text
@wx/collector build: succeeded
@wx/shared build: succeeded
@wx/web build: succeeded
```

The web production build emitted its existing Vite chunk-size warning.

```sh
npm test
```

```text
@wx/collector: 12 passed
@wx/shared: 8 passed
@wx/web: 11 Vitest tests and 14 Playwright tests passed
Branches: 75.22% (252/335)
```
