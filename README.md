# My Weather Station

Reads BLE advertisements from SwitchBot indoor and outdoor meters using [`@stoprocent/noble`](https://www.npmjs.com/package/@stoprocent/noble), stores the measurements in
PostgreSQL, and shows them in a web app.

## Repository layout

An npm workspaces monorepo.

```text
packages/collector  @wx/collector  BLE daemon. Reads the meters and writes to PostgreSQL.
                                    Owns .env, Dockerfile, and the development seed.
packages/web        @wx/web        React + Vite app. Reads measurements through the Node.js API.
packages/api        @wx/api        Hono backend for current measurements and chart history.
packages/shared     @wx/shared     Shared domain schemas, UUID normalization,
                                  and the Node-only PostgreSQL client and migrations.
```

The root holds shared tooling: the workspace globs, the Oxlint and Oxfmt configuration, the TypeScript base config and the lockfile.

### How the workspaces fit together

The `workspaces` field in the root `package.json` holds directory globs, not package names. `["packages/*"]` finds all workspaces. To add one, create the directory with
its own `package.json` and run `npm install`. The root file does not change.

`npm install` creates a single `node_modules` at the root, plus a symlink there for every workspace. A workspace therefore imports another by package name, with no build
step:

```ts
import { normalizeUuid } from '@wx/shared/utils/normalizeUuid.util.ts';
```

Inside a workspace, never climb directories with `../`. Use the `imports` field of that workspace's own `package.json`. These are Node subpath imports, not TypeScript
aliases, so they also resolve at runtime under native type stripping:

```ts
import { createMeter } from '#meters/meter.factory.ts';
```

## Prerequisites

- Node.js 26 or newer, for native TypeScript support
- A modern browser for the web app
- A Bluetooth adapter, and Bluetooth permission for the terminal or Node.js
- Docker or another Docker-compatible container runtime

## Local development setup

Install every workspace at once, from the repository root:

```sh
npm install
```

### Collector

Create `packages/collector/.env`:

```dotenv
DEVICES=[{"deviceId":"ae67de586d5f7a96cce7f6179f1c740f","type":"outdoor","deviceName":"garden"},{"deviceId":"f2c1f72ae2258e5affbe6f8e7bc147b3","type":"indoor","deviceName":"kitchen"}]
BLE_TIMEOUT_MS=15000
SCAN_RETRIES=8
```

`DEVICES` is a JSON array of meter identifiers, strategy types, and required unique `deviceName` values. On macOS, use the Noble peripheral ID in `deviceId`. On Raspberry
Pi Linux, use the Bluetooth address from `ble-raw.ts` in `address`, including the colons. Meters are read sequentially. `BLE_TIMEOUT_MS` is the timeout of one scan
attempt and defaults to 15 seconds. `SCAN_RETRIES` is the maximum number of attempts and defaults to 8.

### Shared database

`packages/shared/.env` contains the local Supabase PostgreSQL settings for the collector, API, and Knex. `POSTGRES_TIMEOUT_MS` sets the connection, query, and pool
timeout and defaults to 15 seconds.

`npm run supabase:status` shows the local API and PostgreSQL URLs.

### Web app

With Docker running, start local PostgreSQL through Supabase and apply the shared migrations from the repository root:

```sh
npm run supabase:start
npm run migrate:local -w @wx/shared
```

Then start the API in one terminal and the web app in another:

```sh
npm run dev -w @wx/api
```

```sh
npm run dev -w @wx/web
```

Open <http://localhost:5173/my-weather-station/>.

If you need sample data, run `npm run dev -w @wx/collector` separately. **This replaces all local measurements with sample data.**

The web app uses `VITE_API_BASE_URL` from `packages/web/.env` in development and `packages/web/.env.prod` for the production build.

### API

Start local Supabase and apply the shared database migrations before using the measurement endpoints or running the API tests.

```sh
npm run dev -w @wx/api
curl 'http://localhost:3000/get-latest-measure?device_name=kitchen'
curl 'http://localhost:3000/get-chart-history?start_date=2026-01-02T09:00:00Z&end_date=2026-01-02T10:00:00Z'
npm run test:unit -w @wx/api
```

The latest endpoint matches the exact stored device name and returns `null` if none matches. Chart history is grouped by device name and includes both bounds. Supply ISO
8601 timestamps with a time zone. If `end_date` is omitted or in the future, the end is now. History covers at most 31 days ending at that effective end.

Build the image from the repository root. Pass the `POSTGRES_*` variables at runtime, with a `POSTGRES_HOST` reachable from inside the container. The API's HTTP `PORT`
defaults to `3000`.

```sh
docker build -f packages/api/Dockerfile -t wx-api .
```

### How to add a new meter

Add the collector device with a unique `deviceName`:

```dotenv
DEVICES=[{"deviceId":"new-device-id","type":"indoor","deviceName":"office"}]
```

Add the same name to `VITE_DEVICES` in both web environment files, together with a supported React Icons export name:

```dotenv
VITE_DEVICES=[{"deviceName":"office","icon":"FaCouch"}]
```

Supported icons are `FaSeedling`, `FaKitchenSet`, `FaCouch`, and `FaBed`.

Each `VITE_DEVICES.deviceName` must match the collector `DEVICES.deviceName`. Adding a collector device also requires adding its device name and supported React Icons
export name to the web configuration, then deploying the web app.

## Commands

A script that concerns one workspace lives in that workspace, so run it with `-w`.

```sh
npm run store-measure -w @wx/collector              # run the collector continuously
npm run new:migration -w @wx/shared -- <name>       # create a migration
npm run migrate:local -w @wx/shared                 # apply migrations to local Supabase
npm run migrate -w @wx/shared                       # apply migrations to production
npm run rollback:local -w @wx/shared                # undo the last local batch
```

The collector reads and stores measurements for each configured meter, then waits five minutes before starting the next cycle.

Migrations live in `packages/shared/migrations/`. Local commands load `packages/shared/.env`. To apply migrations in production, put the production `POSTGRES_*` settings
in the untracked `packages/shared/.env.prod`.

Run these commands from the repository root:

```sh
npm run supabase:start   # start the local Supabase stack
npm run supabase:stop    # stop the local Supabase stack
npm run supabase:status  # show local endpoints
npm run fmt              # apply Oxfmt formatting, whole repository
npm run lint             # run Oxlint and apply fixes, whole repository
npm run check            # apply formatting and lint fixes, then run type checks, tests, and coverage
npm run typecheck        # TypeScript check for every workspace
npm run build            # type check, plus the production build of the web app
npm run test:unit        # run Vitest tests in every workspace
npm run test:e2e         # run Playwright end-to-end tests
npm run test:coverage    # run tests and coverage in every workspace
```

Browser tests run in Chromium and WebKit, Safari's browser engine. Coverage is collected from Chromium only. Install the browser binaries before running the tests:

```sh
npx playwright install chromium webkit
```

To run only the Safari engine tests:

```sh
npm run test:e2e -w @wx/web -- --project=mocked-http-webkit --project=webkit --no-deps
```

### Real-data browser tests

`npm run test:e2e -w @wx/web` includes real Node.js API scenarios in `packages/web/tests/e2e/`. Start local Supabase PostgreSQL and apply the shared migrations first.
Playwright starts the API on port `4175` and a separate Vite server on port `4174` for these scenarios. The `mocked-http-chromium` and `mocked-http-webkit` projects run
`tests/ui/` with simulated HTTP responses.

The real-data projects run sequentially in Chromium and WebKit with a unique device name per run. Tests insert committed measurements with recent timestamps and delete
only their own row IDs during fixture cleanup, including after failures. Existing development data is not deleted. A forcibly terminated test process can leave its
inserted rows behind.

To run only the real-data scenarios in both browsers:

```sh
npm run test:e2e -w @wx/web -- --project=chromium --project=webkit
```

To run only their WebKit project without its Chromium dependency:

```sh
npm run test:e2e -w @wx/web -- --project=webkit --no-deps
```

### Visual snapshots

Full-page dashboard screenshots cover desktop (1280 × 700), tablet (1024 × 714), and smartphone (390 × 844) in Chromium and WebKit. The reference PNGs live in
`packages/web/tests/visual/dashboard.visual.spec.ts-snapshots/`.

Run comparisons in the same Linux container used by CI. The root `npm run test:visual` shortcut forwards to this command:

```sh
npm run test:visual -w @wx/web
```

After an intentional UI change, regenerate the references and review the PNG diffs before committing them:

```sh
npm run test:visual -w @wx/web -- --update-snapshots
```

The wrapper selects the official Playwright image matching the version in the root `package.json` and pins `linux/amd64`, including on Apple Silicon. This avoids OS and
browser architecture differences, but emulation makes local visual tests slower on Apple Silicon. Docker must be running; the first run downloads the image.

Linux dependencies are installed in disposable Docker volumes with lifecycle scripts disabled because visual tests do not need the collector's native BLE bindings. Host
`node_modules` directories are not changed. The image supplies its own Node runtime for visual tests only; the other checks still use Node.js 26. The container install
can report an engine warning for the Node.js 26 lint tool, which is not run there.

The tests use fixed readings, disable motion, and block remote Google Fonts requests so screenshots use the app's fallback fonts without depending on network
availability. CI uses the same wrapper and uploads failure images as `visual-test-results`. It never updates reference images automatically.

Regular browser tests explicitly exclude the `@visual` tag. `npm run check` validates those tests and coverage; run the Docker command above separately for visual
comparisons. The wrapper invokes Playwright directly inside the container.

## Deployment

### Web UI on GitHub Pages

The web UI deploys automatically after each push to `main`:

<https://emiliosp.github.io/my-weather-station/>

In GitHub, open **Settings** → **Pages** and set **Source** to **GitHub Actions**. The public Render URL is set in `packages/web/.env.prod`. Deploy the API with CORS
support before switching GitHub Pages to it; see the [deployment guide](docs/deployment.md).

### Collector

See the [collector deployment guide](docs/deployment.md).

## Architecture

### Collector

The collector uses the Strategy pattern:

```text
packages/collector/index.ts
  └── meters/meter.factory.ts
      └── meters/Meter strategy
          ├── api/sensor.api.ts
          │   └── @stoprocent/noble
          ├── repository/measurement.repository.ts
          │   └── @wx/shared/db.ts → PostgreSQL
          └── errors/NoCompleteReadingError.ts
```

`index.ts` is the startup and presentation layer. For each configured device it asks `createMeter()` for the correct strategy, calls `read()`, and prints the stored
measure.

The folders have clear responsibilities:

- `api/` handles external resources, including BLE advertisements.
- `repository/` stores measures using the shared PostgreSQL client.
- `errors/` contains domain errors.
- `meters/` contains business logic that converts advertisements into measures.

`OutdoorMeter` and `IndoorMeter` extend the abstract `Meter` class and implement `MeterInterface`, which exposes `getMeter()` for the device ID and type, and `read()` for
the stored measure. Each strategy owns its meter-specific decoding. The shared `Meter` class reads advertisements through `api/sensor.api.ts`, calculates dew point and
heat index with `meters/utils/`, stores the reading through `repository/measurement.repository.ts`, and returns the inserted row.

### Web app

```text
packages/web/main.tsx
  └── views/WeatherStation.tsx
      └── hooks/useWeatherStation.ts
          └── api/ (latest measurement and chart history)
              └── Node.js API -> PostgreSQL
```

`environment.ts` validates `VITE_API_BASE_URL` and `VITE_DEVICES` with Zod at startup.

### Shared

The collector, API, and web app use `Measurement` from `packages/shared`. Stored measurements keep their PostgreSQL snake_case field names across all three workspaces.

The API and collector import their PostgreSQL client from the Node-only `@wx/shared/db.ts` export. Each process has its own pool. The web app imports only the
platform-neutral schemas and utilities.

## Output

The collector prints an array, so that more devices can be added later:

```json
[
  {
    "id": "4f7edb49-14fa-426f-bd3a-bfcf5872ce65",
    "device_id": "ae67de586d5f7a96cce7f6179f1c740f",
    "address": null,
    "device_type": "outdoor",
    "device_name": "garden",
    "temperature": 32.2,
    "dew_point": 16.5,
    "heat_index": 32.4,
    "humidity": 39,
    "battery": 96,
    "signal_power_dbm": -89,
    "measured_at": "2026-08-25T16:12:03+00:00[UTC]"
  }
]
```

## BLE signal power

`signal_power_dbm` is the Bluetooth signal strength received by the computer. It is also called RSSI and is measured in dBm. A value closer to `0` means a stronger
signal.

|      Value | Quality         |
| ---------: | --------------- |
|  `-30 dBm` | Excellent       |
|  `-50 dBm` | Strong          |
|  `-70 dBm` | Acceptable      |
|  `-80 dBm` | Weak            |
|  `-90 dBm` | Very weak       |
| `-100 dBm` | Almost unusable |

For example, `-89 dBm` is a very weak signal. BLE packets can be missed, so reading the thermometer can take longer or time out.

Distance, walls, metal objects, battery condition, and radio interference change the value. Move the computer or the Bluetooth adapter closer to improve reception. The
value is measured when the packet is received, so it changes between readings.

## Project constitution

- [Mission](docs/MISSION.md)
- [Tech stack](docs/TECH_STACK.md)
- [Roadmap](docs/roadmap/README.md)
- [Changelog](CHANGELOG.md)
- [Architecture decision records](docs/adr/README.md)
