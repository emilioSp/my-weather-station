# 01a0af84ddea-device-name-dashboard: Use configured device names in the dashboard

## Problem

The dashboard identifies measurements by `device_type`. A type selects a collector strategy. A name identifies the device shown to the user. Dashboard queries and labels must use configured device names.

## Constraints

- Do not add dependencies.
- Keep `device_type` stored as legacy data.
- The collector uses a meter type to select a strategy.
- The web app must not use `device_type` to filter, group, label, order, colour, or identify measurements.
- Configure dashboard devices through `VITE_DEVICES` as a JSON array of objects with `deviceName` and `icon`.
- `deviceName` is a non-empty, unique device name. `icon` is the React Icons export name in the supported icon map, such as `FaHouse` or `FaSeedling`.
- Do not add a database view or a PostgreSQL function for latest measurements.
- For each configured device, the web API queries `measures` by `device_name`, orders `measured_at` descending, and limits the result to one row.
- The owner has already created and applied the device-name index migrations to the local database. Do not create another index migration.
- Create one new migration for `get_chart_history` only.
- The history function groups and downsample each `device_name` separately.
- Keep the existing page structure and responsive behaviour. Device names replace the current `Indoor` and `Outdoor` text.

## Allowed paths

- `README.md`
- `packages/collector/migrations/**`
- `packages/web/.env`
- `packages/web/.env.prod`
- `packages/web/environment.ts`
- `packages/web/environment.test.ts`
- `packages/web/supabase.api.ts`
- `packages/web/supabase.api.test.ts`
- `packages/web/hooks/useWeatherStation.ts`
- `packages/web/hooks/useWeatherStation.test.ts`
- `packages/web/weather-dashboard.util.ts`
- `packages/web/weather-dashboard.util.test.ts`
- `packages/web/views/WeatherStation.tsx`
- `packages/web/components/weather-station/CurrentReadings.tsx`
- `packages/web/components/weather-station/WeatherCard.tsx`
- `packages/web/components/weather-station/MeasurementHistory.tsx`
- `packages/web/components/weather-station/MeterAccordion.tsx`
- `packages/web/components/weather-station/LinearChart.tsx`
- `packages/web/e2e/weather-station.spec.ts`
- `packages/web/e2e/temperature-units.spec.ts`
- `.specs/01a0af84ddea-device-name-dashboard/**`

## Technical details

Set the web configuration in both tracked Vite environment files. For example:

```env
VITE_DEVICES=[{"deviceName":"kitchen","icon":"FaHouse"},{"deviceName":"garden","icon":"FaSeedling"}]
```

Validate the JSON at startup with Zod. Reject invalid JSON, blank or duplicate names, and icon names not in the static React Icons map. The map imports the supported icons by their React Icons export names. It uses the configured icon for each card.

Keep the latest-measure operation in `packages/web/supabase.api.ts`. For every configured name, query `measures` with `device_name`, descending `measured_at`, and `limit(1)`. It does not filter or group by device type.

The owner has already created and applied these migrations to the local database:

- `20260917132932_add_device_name_and_measured_at_id_index.ts` creates `measures_device_name_measured_at_index` on `(device_name, measured_at DESC)`.
- `20260917133138_drop_index_device_type_and_measured_at.ts` drops `measures_device_type_measured_at_index`.

Do not replace, duplicate, or change those index migrations. Create a separate migration for `get_chart_history`. It filters by the requested time range, partitions downsampling by `device_name`, and returns a JSON object keyed by device name. Its down migration restores the current type-based function.

The web API returns latest measurements in configured device order and name-keyed history. The hook and components derive cards, history sections, chart labels, accessibility labels, and test ids from the configured names. For history, ignore names not in `VITE_DEVICES` and ignore configured names that have no history key. Do not create an empty history group for a missing key. Cards use their configured icon. Charts assign presentation colours by device order, not by device type.

Update the stale collector `DEVICES` example and description in the root README to include its required `deviceName`. Document `VITE_DEVICES` in the README section "How to add a new meter". State that each `VITE_DEVICES.deviceName` must match the collector `DEVICES.deviceName`, and that adding a collector device also requires adding its device name and supported React Icons export name to the web configuration, then deploying the web app.

## Acceptance criteria

### AC1: The Vite configuration accepts named devices with supported React Icons and rejects invalid configuration.

- probe: `npm run test:unit -w @wx/web -- environment.test.ts`
- postcondition: valid `VITE_DEVICES` data returns ordered `deviceName` and icon pairs; blank or duplicate device names, invalid JSON, and unsupported React Icons names fail validation.
- breakage: remove the duplicate-name validation or accept an icon name absent from the icon map.

### AC2: The query API returns one latest row per configured device name and history groups by device name.

- probe: `npm run migrate:local -w @wx/collector && npm run test:unit -w @wx/web -- supabase.api.test.ts`
- postcondition: real Supabase requests query each configured device name, return one newest complete row for each of at least two names that share one device type, and return a separate history array for each name.
- breakage: filter a latest query or group history by `device_type`.

### AC3: The dashboard shows two configured names and icons without device-type labels.

- probe: `npm run test:e2e -w @wx/web -- weather-station.spec.ts`
- postcondition: two mocked configured devices show cards, their configured icon test ids, accordion titles, chart labels, and chart accessibility labels; the page shows neither `Indoor` nor `Outdoor`; at 390 px it has no horizontal scroll. History ignores an unconfigured name and a configured name that has no history key.
- breakage: replace a device-name heading with `Indoor`, use a fixed card icon instead of the configured icon, or render a history section for a missing history key.

### AC4: Refresh, ranges, and temperature units preserve configured device groups.

- probe: `npm run test:unit -w @wx/web -- useWeatherStation.test.ts weather-dashboard.util.test.ts && npm run test:e2e -w @wx/web`
- postcondition: refresh compares latest rows by configured device name, a range change keeps each name with its measurements, and temperature-unit tests use configured name data.
- breakage: key current measurements by `deviceType`.

## Out of scope

- Removing the stored `device_type` column.
- Changing collector meter strategies or collector configuration.
- Adding a devices table, database view, or latest-measure PostgreSQL function.
- Backfilling or deleting measurements.

