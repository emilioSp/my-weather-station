# Builder evidence: 2026-09-01-temperature-units

## AC1

Red breakage: replaced the Fahrenheit-aware heat-index tooltip format with a fixed Celsius value in `LinearChart.tsx`.

```text
$ npm run test -w @wx/web -- e2e/temperature-units.spec.ts
1 failed, 2 passed
Expected substring: "63.9°F"
Received string: "...Temperature64.4°FHeat index17.7°C"
```

Restored the selected unit for the heat-index tooltip.

```text
$ npm run test -w @wx/web -- e2e/temperature-units.spec.ts
3 passed (5.6s)
```

## AC2

Red breakage: removed the `localStorage.setItem` call after selection.

```text
$ npm run test -w @wx/web -- e2e/temperature-units.spec.ts
1 failed, 2 passed
persists Fahrenheit after reload: Expected checked, received unchecked
```

Restored the localStorage write.

```text
$ npm run test -w @wx/web -- e2e/temperature-units.spec.ts
3 passed (6.0s)
```

## AC3

Red breakage: returned Fahrenheit for invalid and unavailable stored values.

```text
$ npm run test -w @wx/web -- e2e/temperature-units.spec.ts
3 failed
 defaults safely to Celsius without valid browser storage: Expected checked, received unchecked
```

Restored Celsius fallback for invalid and unavailable storage.

```text
$ npm run test -w @wx/web -- e2e/temperature-units.spec.ts
3 passed (4.9s)
```

## AC4

Red breakage: removed `temperatureUnit` from the `LinearChart` call in `MeterAccordion.tsx`.

```text
$ npm run build -w @wx/web
components/weather-station/MeterAccordion.tsx(33,14): error TS2741: Property 'temperatureUnit' is missing ... but required in type 'LinearChartProps'.
```

Restored the required property.

```text
$ npm run build -w @wx/web
✓ built in 1.10s
```

## Lint

```text
$ npm run lint
Checked 64 files in 40ms. Fixed 8 files.
```

## Visual comparison

Rendered and inspected the prototype and Fahrenheit-selected app at the workspace target resolutions using Chromium. The selector matches the prototype placement beside refresh on desktop/tablet and remains compact in the header on smartphone. The actual app keeps the pre-existing health, range, and accordion content outside the prototype scope; all shown temperature cards and chart axes/extrema use Fahrenheit while humidity remains percent-based.

```text
$ npm run dev -w @wx/web -- --host 127.0.0.1 --port 4173
$ node --input-type=module -e "... chromium fixture routing and screenshot capture ..."
```

- Desktop 1280x700: `.fleet/stories/2026-09-01-temperature-units.prototype-desktop.png`, `.fleet/stories/2026-09-01-temperature-units.actual-desktop.png`
- Tablet 768x1024: `.fleet/stories/2026-09-01-temperature-units.prototype-tablet.png`, `.fleet/stories/2026-09-01-temperature-units.actual-tablet.png`
- Smartphone 390x844: `.fleet/stories/2026-09-01-temperature-units.prototype-smartphone.png`, `.fleet/stories/2026-09-01-temperature-units.actual-smartphone.png`
