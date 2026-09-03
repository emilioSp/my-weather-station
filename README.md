# My Weather Station

Reads BLE advertisements from SwitchBot indoor and outdoor meters using
[`@stoprocent/noble`](https://www.npmjs.com/package/@stoprocent/noble), stores the
measurements in PostgreSQL, and shows them in a web app.

## Repository layout

An npm workspaces monorepo with three workspaces.

```text
apps/collector    @wx/collector  BLE daemon. Reads the meters and writes to PostgreSQL.
                                 Owns .env, Dockerfile, knexfile.js and migrations/.
apps/web          @wx/web        React + Vite app. Reads the measures from Supabase.
packages/shared   @wx/shared     Domain schemas, the camelCase <-> snake_case mapping,
                                 and UUID normalization.
```

The root holds only what is shared: the workspace globs, the Biome config, the TypeScript
base config and the lockfile.

### How the workspaces fit together

The `workspaces` field in the root `package.json` holds directory globs, not package names.
`["apps/*", "packages/*"]` is two lines and finds three workspaces. To add one, create the
directory with its own `package.json` and run `npm install`. The root file does not change.

`npm install` creates a single `node_modules` at the root, plus a symlink there for every
workspace. A workspace therefore imports another by package name, with no build step:

```ts
import { normalizeUuid } from '@wx/shared';
```

Inside a workspace, never climb directories with `../`. Use the `imports` field of that
workspace's own `package.json`. These are Node subpath imports, not TypeScript aliases, so
they also resolve at runtime under native type stripping:

```ts
import { createMeter } from '#meters/meter.factory.ts';
```

## Prerequisites

* Node.js 26 or newer, for native TypeScript support
* A Bluetooth adapter, and Bluetooth permission for the terminal or Node.js
* Docker or another Docker-compatible container runtime

## Local development setup

Install every workspace at once, from the repository root:

```sh
npm install
```

### Collector

Create `apps/collector/.env`:

```dotenv
DEVICES=[{"deviceId":"ae67de586d5f7a96cce7f6179f1c740f","type":"outdoor"},{"deviceId":"f2c1f72ae2258e5affbe6f8e7bc147b3","type":"indoor"}]
BLE_TIMEOUT_MS=15000
SCAN_RETRIES=8
POSTGRES_TIMEOUT_MS=15000
POSTGRES_HOST=localhost
POSTGRES_PORT=54322
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

`DEVICES` is a JSON array of meter identifiers and strategy types. On macOS, use the Noble
peripheral ID in `deviceId`. On Raspberry Pi Linux, use the Bluetooth address from
`ble-raw.ts` in `address`, including the colons. Meters are read sequentially.
`BLE_TIMEOUT_MS` is the timeout of one scan attempt and defaults to 15 seconds.
`SCAN_RETRIES` is the maximum number of attempts and defaults to 8.
`POSTGRES_TIMEOUT_MS` is the connection, query, and pool timeout for PostgreSQL. It defaults to 15 seconds.

The npm scripts use Node.js native `.env` support. No environment package is required.

Start Supabase local, then apply the Knex schema and create the dataset:

```sh
npm run supabase:start
npm run migrate:local -w @wx/collector
npm run seed:local -w @wx/collector
```

`npm run supabase:status` shows the local API and PostgreSQL URLs.

### Web app

The web app reads the `measures` table through the local Supabase API.
`apps/web/.env` contains the local endpoint and public key. `apps/web/.env.prod`
contains the production values. Vite loads `.env` during development. Its build
command uses the `prod` mode, which gives `.env.prod` priority.

## Commands

A script that concerns one workspace lives in that workspace, so run it with `-w`.

```sh
npm run store-measure -w @wx/collector              # read the meters once and store
npm run dev -w @wx/web                              # web app in development mode
npm run new:migration -w @wx/collector -- <name>    # create a migration
npm run migrate:local -w @wx/collector              # apply migrations to local Supabase
npm run migrate -w @wx/collector                    # apply migrations to production
npm run rollback:local -w @wx/collector             # undo the last local migration
npm run seed:local -w @wx/collector                 # replace local measures with one year of test data
```

`seed:local` runs only with `NODE_ENV=development` and uses `apps/collector/.env`.
It deletes every row from the local `measures` table before it creates the test dataset.

The root keeps only the scripts that act on every workspace:

```sh
npm run supabase:start   # start the local Supabase stack
npm run supabase:stop    # stop the local Supabase stack
npm run supabase:status  # show local endpoints
npm run lint             # Biome, whole repository
npm run build            # type check, plus the production build of the web app
npm test                 # run tests in every workspace
npm run dev              # every workspace that defines dev
```

## Deployment

### Web UI on GitHub Pages

The web UI deploys automatically after each push to `main`:

<https://emiliosp.github.io/my-weather-station/>

In GitHub, open **Settings** → **Pages** and set **Source** to **GitHub Actions**.
The Supabase URL and publishable key are deliberately committed in
`apps/web/.env.prod`. They are public browser credentials; Supabase row level
security protects the data.

### Collector

See [DEPLOY.md](DEPLOY.md).

## Architecture

### Collector

The collector uses the Strategy pattern:

```text
apps/collector/index.ts
  └── meters/meter.factory.ts
      └── meters/Meter strategy
          ├── api/sensor.api.ts
          │   └── @stoprocent/noble
          ├── db/measure.repository.ts
          │   └── db/db.ts
          │       └── PostgreSQL
          └── errors/NoCompleteReadingError.ts
```

`index.ts` is the startup and presentation layer. For each configured device it asks
`createMeter()` for the correct strategy, calls `read()`, and prints the stored measure.

The folders have clear responsibilities:

* `api/` handles external resources, including BLE advertisements.
* `db/` manages the PostgreSQL connection and stores measures.
* `errors/` contains domain errors.
* `meters/` contains business logic that converts advertisements into measures.

`OutdoorMeter` and `IndoorMeter` extend the abstract `Meter` class and implement
`MeterInterface`, which exposes `getMeter()` for the device ID and type, and `read()` for the
stored measure. Each strategy owns its meter-specific decoding. The shared `Meter` class
reads advertisements through `api/sensor.api.ts`, calculates dew point and heat index with
`meters/utils/`, stores the reading through `db/measure.repository.ts`, and returns the
inserted row.

### Web app

```text
apps/web/main.tsx
  └── App.tsx
      └── supabase.api.ts
          └── @supabase/supabase-js -> PostgREST -> PostgreSQL
```

`supabase.api.ts` is the only boundary to Supabase. `environment.ts` validates the two
`VITE_` variables with Zod at startup.

### Shared

Both apps write to and read from the same table, through two different clients. What they
have in common lives in `packages/shared`:

* the domain schemas, `measureSchema` and the schemas it is built from;
* `toCamelCaseKeys` and `toSnakeCaseKeys`, applied at every database boundary;
* `normalizeUuid`.

The mapping matters because the database columns are snake_case while the domain types are
camelCase. Knex can do this on its own, but only for Knex: the Supabase client returns raw
columns. Keeping one rule in `packages/shared` means both clients produce the same shape.

`packages/shared` compiles without `@types/node` and without the DOM library, so a `Buffer`
or a `document` in shared code fails the type check. That is what keeps BLE types in the
collector and browser types in the web app.

## Output

The collector prints an array, so that more devices can be added later:

```json
[
  {
    "id": "4f7edb49-14fa-426f-bd3a-bfcf5872ce65",
    "deviceId": "ae67de586d5f7a96cce7f6179f1c740f",
    "address": null,
    "deviceType": "outdoor",
    "temperature": 32.2,
    "dewPoint": 16.5,
    "heatIndex": 32.4,
    "humidity": 39,
    "battery": 96,
    "signalPowerDBM": -89,
    "measuredAt": "2026-08-25T16:12:03+00:00[UTC]"
  }
]
```

## BLE signal power

`signalPowerDBM` is the Bluetooth signal strength received by the computer. It is also
called RSSI and is measured in dBm. A value closer to `0` means a stronger signal.

| Value | Quality |
|---:|---|
| `-30 dBm` | Excellent |
| `-50 dBm` | Strong |
| `-70 dBm` | Acceptable |
| `-80 dBm` | Weak |
| `-90 dBm` | Very weak |
| `-100 dBm` | Almost unusable |

For example, `-89 dBm` is a very weak signal. BLE packets can be missed, so reading the
thermometer can take longer or time out.

Distance, walls, metal objects, battery condition, and radio interference change the value.
Move the computer or the Bluetooth adapter closer to improve reception. The value is measured
when the packet is received, so it changes between readings.
