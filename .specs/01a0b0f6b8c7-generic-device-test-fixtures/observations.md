# Builder observations

These are probe observations for independent regeneration.

## AC1

Breakage applied: changed the expected ordered device list to end with `missing-device`.

Command:

```text
npm run test:unit -w @wx/web -- hooks/useWeatherStation.test.ts
```

Breakage output:

```text
❯ hooks/useWeatherStation.test.ts (3 tests | 1 failed)
× useWeatherStation > loads current measures when initial state is empty
AssertionError: expected [ 'device-alpha', 'device-beta', …(2) ] to deeply equal [ 'device-alpha', 'device-beta', …(2) ]
-   "missing-device"
+   "device-delta"
Tests 1 failed | 2 passed (3)
[exit 1]
```

After restoring the expected configured list, the same command output:

```text
Test Files  1 passed (1)
Tests  3 passed (3)
```

## AC2

Breakage applied: changed the latest-row fixture lookup to return the first configured row for every requested device.

Command:

```text
npm run test:e2e -w @wx/web -- weather-station.spec.ts temperature-units.spec.ts
```

Breakage output:

```text
Running 15 tests using 2 workers
1 failed, 14 passed (13.8s)
Error: expect(locator).toContainText(expected) failed
Expected substring: "69.8°F"
Received string: "...68.0°F...68.0°F...68.0°F...68.0°F..."
[exit 1]
```

After restoring the name-keyed fixture lookup, the same command output:

```text
Running 15 tests using 2 workers
15 passed (13.5s)
```

## AC3

Breakage applied: removed the latest-measure route from the refresh test.

Command:

```text
npm run test:coverage -w @wx/web
```

Breakage output:

```text
Test Files  5 passed (5)
Tests  19 passed (19)
Running 18 tests using 3 workers
1 failed, 17 passed (16.1s)
Error: expect(locator).toContainText(expected) failed
Expected substring: "20.0°C"
Received string: "...No readings available..."
[exit 1]
```

After restoring the refresh route, the same command output:

```text
Test Files  5 passed (5)
Tests  19 passed (19)
Running 18 tests using 3 workers
18 passed (12.4s)
Statements   : 90.92% ( 1704/1874 )
Branches     : 75.3% ( 250/332 )
Functions    : 88.23% ( 90/102 )
Lines        : 98.19% ( 1581/1610 )
```

Final hygiene probes run before this record:

```text
npm run lint
# Checked 113 files in 42ms. No fixes applied.

npm run build
# @wx/collector build succeeded
# @wx/shared build succeeded
# @wx/web build succeeded
```
