# 01a0ae5c8d4c-device-name-measure: Store and return device names

## Problem

Each stored measurement must carry the configured device name. The name must be returned by the existing Supabase API queries. The UI will use the field in a later spec.

## Constraints

- Do not add dependencies.
- Add `device_name` as `TEXT NOT NULL DEFAULT 'UNKNOWN'` to `measures`.
- Keep `device_name` non-unique in `measures` because one device has many measurements.
- Require a non-empty string `deviceName` on every `DEVICES` item.
- Reject `DEVICES` arrays that contain duplicate `deviceName` values.
- Store the configured `deviceName` on every new measurement.
- Existing and raw inserted measurements use the database default `UNKNOWN` until the owner backfills them.
- Return `device_name` from `get_chart_history` as well as from direct `measures` reads.
- Do not change the UI.

## Allowed paths

- `packages/collector/types.ts`
- `packages/collector/environment.ts`
- `packages/collector/environment.test.ts`
- `packages/collector/meters/Meter.ts`
- `packages/collector/meters/Meter.test.ts`
- `packages/collector/meters/utils/utils.test.ts`
- `packages/collector/db/measure.repository.ts`
- `packages/collector/db/measure.repository.test.ts`
- `packages/collector/migrations/**`
- `packages/shared/types.ts`
- `packages/shared/shared.test.ts`
- `packages/web/supabase.api.test.ts`
- `packages/web/hooks/useWeatherStation.test.ts`
- `packages/web/weather-dashboard.util.test.ts`
- `.specs/01a0ae5c8d4c-device-name-measure/**`

## Technical details

Extend the collector meter configuration and shared measure schema with camel-case `deviceName`. Validate configuration uniqueness after parsing the `DEVICES` array. Pass the configured name through the meter and repository to the database.

Create a new migration that adds the non-null column with the agreed default and replaces `get_chart_history` so its selected JSON rows include `device_name`. Its down migration removes the function change and the column. Do not edit prior migrations.

Update focused collector, shared, and web API integration tests. Test fixtures must provide names where they represent configured devices.

## Acceptance criteria

### AC1: The database stores a required device name and supplies `UNKNOWN` when no name is inserted.

- probe: `npm test -w @wx/collector -- db/measure.repository.test.ts`
- postcondition: a repository-created measure has its configured `device_name`, and a raw insert without that column reads back `UNKNOWN`.
- breakage: remove `device_name` from the repository insert or remove the column default from the migration.

### AC2: The collector accepts named devices only when their names are non-empty and unique, then stores the configured name.

- probe: `npm test -w @wx/collector -- environment.test.ts meters/Meter.test.ts`
- postcondition: duplicate or blank device names make environment validation fail, and a meter read sends its configured name to storage.
- breakage: remove the duplicate-name refinement or omit `deviceName` from the meter storage input.

### AC3: The shared measure contract and both existing Supabase read paths expose `deviceName`.

- probe: `npm test -w @wx/shared && npm test -w @wx/web -- supabase.api.test.ts`
- postcondition: the shared measure schema accepts `deviceName`; latest-measure and chart-history responses from the local Supabase API contain the stored name.
- breakage: remove `device_name` from the chart-history function selection or from the shared measure schema.

## Out of scope

- Backfilling existing `UNKNOWN` values.
- Displaying device names in the web UI.
- Adding a separate devices table.
- Making `device_name` unique in `measures`.

