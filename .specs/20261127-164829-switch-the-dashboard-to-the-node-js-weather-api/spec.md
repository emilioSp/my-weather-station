# 20261127-164829-switch-the-dashboard-to-the-node-js-weather-api: Switch the dashboard to the Node.js weather API

## Requirements

### REQ1: The dashboard MUST read current measurements and chart history from the Node.js API

Delta: modified

Before: The browser reads measurements through Supabase PostgREST.

The browser no longer sends measurement requests to PostgREST or uses a Supabase publishable key.

Verified by: [AC1](#ac1-latest-reading-comes-from-the-nodejs-api), [AC2](#ac2-chart-history-comes-from-the-nodejs-api)

#### AC1: Latest reading comes from the Node.js API

- GIVEN a configured meter has a stored reading
- WHEN the dashboard loads its latest reading
- THEN it requests that meter from the Node.js latest-reading endpoint

| Configured meter and stored reading | Dashboard action | HTTP request |
| --- | --- | --- |
| `kitchen` has a stored reading of 20°C | Open the dashboard | `GET /get-latest-measure?device_name=kitchen` |

#### AC2: Chart history comes from the Node.js API

- GIVEN the dashboard has a latest reading to anchor the chart range
- WHEN it loads chart history
- THEN it sends the selected range to the Node.js chart-history endpoint

| Latest reading and chart range | Dashboard action | HTTP request |
| --- | --- | --- |
| Latest reading is at `2026-11-20T12:00:00.000Z`; default range is three days | Load chart history | `GET /get-chart-history` with `start_date=2026-11-17T12:00:00.000Z` and `end_date=2026-11-20T12:00:00.000Z` |

### REQ2: The web build MUST use VITE_API_BASE_URL as the API base URL

Delta: added

Set it in `packages/web/.env` for development and `packages/web/.env.prod` for the production build.

Verified by: [AC3](#ac3-measurement-requests-use-the-configured-origin)

#### AC3: Measurement requests use the configured origin

- GIVEN an API base URL is set for the web app's Vite mode
- WHEN the browser requests a measurement
- THEN the request goes to that API base URL

| Configured base URL | Dashboard action | Request URL |
| --- | --- | --- |
| `http://localhost:3000` in development | Load the kitchen reading | `http://localhost:3000/get-latest-measure?device_name=kitchen` |
| `https://my-weather-station-api.onrender.com/` in production | Load the kitchen reading | `https://my-weather-station-api.onrender.com/get-latest-measure?device_name=kitchen` |

### REQ3: The collector, API, and web app MUST use one shared snake_case Measure type

Delta: modified

Before: The collector and web app use camelCase `Measure` from `@wx/shared`; the API declares a separate snake_case `MeasurementJson` type.

Use the [shared `Measure` shape](design.md#shared-measure).

Do not define a second measurement shape or rename measurement keys as rows move from PostgreSQL through the API to the web app. Latest remains one measurement or `null`; history remains grouped by exact device name.

Verified by: [AC4](#ac4-all-three-workspaces-use-shared-measure), [AC6](#ac6-collector-returns-snake-case-measurements)

#### AC4: All three workspaces use shared Measure

- GIVEN the collector stores measurements and the API and web app exchange them
- WHEN their measurement declarations and data flow are inspected
- THEN each uses the same snake_case `Measure` from `@wx/shared` without a competing camelCase measurement shape

| Workspace boundary inspected | Example measurement field in use |
| --- | --- |
| Collector receives a stored reading from PostgreSQL | `device_name` on the shared `Measure` row |
| API produces a latest reading | `measured_at` on the shared `Measure` response |
| Web dashboard renders the reading | `signal_power_dbm` on the shared `Measure` from the API |

### REQ4: The browser end-to-end suite MUST exercise the local Node.js API and PostgreSQL without mocks

Delta: modified

Before: The real browser tests use the local Supabase HTTP API; PostgreSQL stores the test readings.

Verified by: [AC5](#ac5-end-to-end-suite-loads-a-reading-through-local-hono)

#### AC5: End-to-end suite loads a reading through local Hono

- GIVEN the local test database contains a seeded measurement
- WHEN the end-to-end suite loads the dashboard with that meter configured
- THEN the browser displays the seeded measurement read through the local Node.js API

| Seeded local reading | Browser action | Displayed reading and source |
| --- | --- | --- |
| Configured `kitchen` meter has a stored 20°C reading | Open the dashboard in a real browser test | The kitchen card displays 20°C from `GET /get-latest-measure?device_name=kitchen` on the local Node.js API |
| Configured `kitchen` meter has 18°C at 11:00 UTC and 20°C at 12:00 UTC on the same day | Open the default chart range in a real browser test | The kitchen chart shows an 18°C low from `GET /get-chart-history` on the local Node.js API |

### REQ5: The collector MUST return stored measurements with their database field names

Delta: modified

Before: The collector converts returned rows to camelCase, which also determines the keys it writes to its JSON logs.

Verified by: [AC6](#ac6-collector-returns-snake-case-measurements)

#### AC6: Collector returns snake-case measurements

- GIVEN the collector has a complete reading ready to store
- WHEN saving the reading returns its stored row
- THEN the collector returns the row using the original database field names

| Complete reading | Collector action | Returned row fields |
| --- | --- | --- |
| Meter `kitchen` reports 20°C and −55 dBm | Store the complete reading | `device_name: "kitchen"`, `temperature: 20`, and `signal_power_dbm: -55`, not `deviceName` or `signalPowerDBM` |

### REQ6: The shared package MUST no longer provide the unused measurement key converters

Delta: removed

Remove `toSnakeCaseKeys.util.ts`, `toCamelCaseKeys.util.ts`, and their `mapKeys.util.ts` helper. No replacement converter is needed.

Verified by: [AC7](#ac7-obsolete-key-converters-are-absent)

#### AC7: Obsolete key converters are absent

- GIVEN the collector and web app use snake_case measurement keys directly
- WHEN the shared utilities are inspected
- THEN the obsolete converter modules and their helper are absent

| Shared utilities directory | Files that no longer exist |
| --- | --- |
| `packages/shared/utils/` after the cutover | `toSnakeCaseKeys.util.ts`, `toCamelCaseKeys.util.ts`, and `mapKeys.util.ts` |
