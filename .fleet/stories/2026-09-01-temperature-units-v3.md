# 2026-09-01-temperature-units-v3: Browser-persisted temperature units

## Problem

Allow web app users to switch all displayed temperature values between Celsius and Fahrenheit. Persist the selected unit in real browser localStorage and verify it with Playwright and Chromium.

## Constraints

- Add `@playwright/test` as a development dependency of `@wx/web`. The maintainer approved this dependency.
- Add the smallest Playwright configuration required to run Chromium against the web app.
- Do not add any other dependency.
- Use an accessible Celsius/Fahrenheit radio group in the `WeatherStationHeader`, next to the refresh control.
- Continue to receive and store measurements in Celsius. Convert values only for display.
- Default to Celsius when no valid saved preference exists.
- Persist only `celsius` or `fahrenheit` in localStorage. Invalid or unavailable stored data must fall back to Celsius.
- The selected unit applies to temperature, dew point, and heat index in current reading cards, chart axes, chart tooltips, and chart extrema.
- Humidity and all non-temperature displays must remain unchanged.

## Paths

- `package-lock.json`
- in general all files in the `apps/web` workspace

## Acceptance criteria

### AC1: The web app switches every temperature display to Fahrenheit

- probe: `npm run test -w @wx/web -- e2e/temperature-units.spec.ts`
- postcondition: A Chromium browser loads the web app, selects the Fahrenheit radio button in the header, and observes Fahrenheit temperature, dew point, and heat index values in current-reading cards and the chart UI, with no Celsius unit shown for these values.
- red_when: Remove the Fahrenheit conversion from the heat-index chart tooltip and rerun the probe.

### AC2: The selected unit survives a browser reload

- probe: `npm run test -w @wx/web -- e2e/temperature-units.spec.ts`
- postcondition: A Chromium browser selects Fahrenheit, reloads the web app, and observes the selected Fahrenheit radio button, Fahrenheit values, and the `fahrenheit` localStorage value.
- red_when: Remove the localStorage write performed after unit selection and rerun the probe.

### AC3: Celsius remains the safe default

- probe: `npm run test -w @wx/web -- e2e/temperature-units.spec.ts`
- postcondition: A Chromium browser with no saved unit and with an invalid saved unit both load the web app with the Celsius radio button selected and Celsius values displayed.
- red_when: Change the invalid stored-value fallback from `celsius` to `fahrenheit` and rerun the probe.

### AC4: The web workspace builds

- probe: `npm run build -w @wx/web`
- postcondition: TypeScript and Vite complete successfully.
- red_when: Remove the required unit property from the `LinearChart` call site in `MeterAccordion.tsx` and rerun the probe.

## Out of scope

- Changes to collector behavior, database schemas, migrations, or API responses.
- User accounts, server-side preference storage, or synchronization across browsers.
- Conversion of humidity, battery, signal, or timestamps.
