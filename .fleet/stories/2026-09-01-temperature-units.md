# 2026-09-01-temperature-units: Browser-persisted temperature units

## Problem

Allow web app users to switch all displayed temperature values between Celsius and Fahrenheit. Persist the selected unit in localStorage.

## Constraints

- No new dependencies.
- Continue to receive and store measurements in Celsius. Convert values only for display.
- Default to Celsius when no valid saved preference exists.
- Persist only `celsius` or `fahrenheit` in localStorage. Invalid or unavailable stored data must fall back to Celsius.
- The selected unit applies to temperature, dew point, and heat index in current reading cards, chart axes, chart tooltips, and chart extrema.
- Humidity and all non-temperature displays must remain unchanged.

## Paths

- `apps/web/views/WeatherStation.tsx`
- `apps/web/components/weather-station/WeatherStationHeader.tsx`
- `apps/web/components/weather-station/CurrentReadings.tsx`
- `apps/web/components/weather-station/WeatherCard.tsx`
- `apps/web/components/weather-station/MeterAccordion.tsx`
- `apps/web/components/weather-station/LinearChart.tsx`
- `apps/web/weather-dashboard.util.ts`
- `apps/web/temperature-unit.util.ts`
- `apps/web/temperature-unit.util.test.ts`

## Acceptance criteria

### AC1: Temperature display conversion is correct

- probe: `node --test apps/web/temperature-unit.util.test.ts`
- postcondition: The test proves 0°C displays as 32.0°F and 100°C displays as 212.0°F, while Celsius values retain one decimal place and the correct unit symbol.
- red_when: Replace the Fahrenheit conversion with `value * 1.8` and rerun the probe.

### AC2: The selected unit is persisted and safely restored

- probe: `node --test apps/web/temperature-unit.util.test.ts`
- postcondition: The test proves a saved `fahrenheit` preference is restored, a newly selected unit is saved, and missing or invalid values resolve to `celsius`.
- red_when: Change the invalid-value fallback from `celsius` to `fahrenheit` and rerun the probe.

### AC3: The web app builds with the unit choice passed to all temperature displays

- probe: `npm run build -w @wx/web`
- postcondition: TypeScript and Vite complete successfully with the selected unit required by current-reading cards and chart components.
- red_when: Remove the required unit property from the `LinearChart` call site in `MeterAccordion.tsx` and rerun the probe.

## Out of scope

- Changes to collector behavior, database schemas, migrations, or API responses.
- User accounts, server-side preference storage, or synchronization across browsers.
- Conversion of humidity, battery, signal, or timestamps.
