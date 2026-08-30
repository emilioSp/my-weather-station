# Collector

## Purpose

This workspace reads BLE advertisements from SwitchBot indoor and outdoor meters and stores complete measurements in PostgreSQL.

## Workspace ownership

This workspace owns:

- `Dockerfile` and `Dockerfile.dockerignore`
- `knexfile.js` and `migrations/`
- BLE, meter, database, and collector configuration code

`packages/shared` owns stored-row types and shared utilities. Do not duplicate them here.

## Architecture

`index.ts` is the startup and presentation layer. It reads validated configuration, creates each meter strategy, calls `read()`, and prints stored measures. Do not put meter protocol or BLE logic in `index.ts`.

```text
index.ts
  -> meters/meter.factory.ts
  -> MeterInterface strategy
     -> IndoorMeter.ts or OutdoorMeter.ts
        -> api/sensor.api.ts
           -> @stoprocent/noble
        -> db/measure.repository.ts
           -> db/db.ts
              -> PostgreSQL
```

## Meter strategies

- `IndoorMeter.ts` and `OutdoorMeter.ts` extend `Meter.ts` and implement `MeterInterface`.
- `MeterInterface` exposes `getMeter()` and `read()`.
- `meter.factory.ts` selects a strategy from `meter.type`.
- Each strategy owns its protocol decoding.
- `Meter.ts` reads advertisements, creates derived values, stores complete measures, and returns the stored row.
- Keep meter-specific state and decoding methods non-public.

## Boundaries

- `api/sensor.api.ts` is the BLE boundary. It manages Noble scanning, finds peripherals, and converts BLE data into `Advertisement` values. It does not decode meter data.
- `db/db.ts` owns the Knex connection and PostgreSQL type parsers.
- `db/measure.repository.ts` stores measures. Map database keys with `toSnakeCaseKeys` and `toCamelCaseKeys` from `@wx/shared` at this boundary.
- `errors/` contains domain errors. `NoCompleteReadingError` represents an incomplete reading after all scan attempts.

## Types, configuration, and utilities

- Put BLE types, collector configuration types, and private types in this workspace.
- Validate environment variables with Zod in `environment.ts` at startup.
- Use Node native type stripping and Node APIs in this workspace.
- Use `Temporal` for date and time values.
- Put shared meter calculations and formatting in `meters/utils/`.

## Naming

- API modules use the `.api.ts` suffix.
- Strategy classes use PascalCase names.
- Factories use the `.factory.ts` suffix.
- Repositories use the `.repository.ts` suffix.
- Domain errors use PascalCase names ending in `Error.ts`.
- Utilities use the `.util.ts` suffix.

## Database migrations

- Create migrations with:

```sh
npm run new:migration -w @wx/collector -- <name>
```

- Store migrations in `migrations/`.
- Write migration changes as raw SQL through Knex.
- Apply local migrations with:

```sh
npm run migrate:local -w @wx/collector
```

## Docker and Supabase local

- Supabase CLI owns the local PostgreSQL and API stack.
- The collector connects to Supabase local PostgreSQL through `apps/collector/.env` on port `54322`.
- The Docker build context is the repository root because it contains the lockfile and `packages/shared`.
- `docker-build-and-push` passes `../..` as the build context.
- Keep the Docker ignore file named `Dockerfile.dockerignore`. A plain `.dockerignore` in this workspace does not apply to the root build context.
- `DEPLOY.md` at the repository root contains collector deployment instructions.
