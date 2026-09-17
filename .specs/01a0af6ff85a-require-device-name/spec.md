# 01a0af6ff85a-require-device-name: Require device names in new measures

## Problem

`measures.device_name` has a database default of `UNKNOWN`. New measurements must provide a device name. Existing `UNKNOWN` rows remain unchanged until the owner removes them.

## Constraints

- Do not add dependencies.
- Create a new migration. Do not edit earlier migrations.
- Remove the default from `measures.device_name`.
- Keep `device_name` as `TEXT NOT NULL`.
- Keep existing rows, including rows whose name is `UNKNOWN`.
- The down migration restores the `UNKNOWN` default.
- Do not change the dashboard or its query API in this spec.

## Allowed paths

- `packages/collector/migrations/**`
- `packages/collector/db/measure.repository.test.ts`
- `.specs/01a0af6ff85a-require-device-name/**`

## Technical details

Add one migration that runs `ALTER TABLE measures ALTER COLUMN device_name DROP DEFAULT`. Its down migration restores `DEFAULT 'UNKNOWN'`.

Update the repository integration test. It must prove that a repository insert with a device name succeeds and that a raw insert with no `device_name` fails in PostgreSQL.

## Acceptance criteria

### AC1: New measurements require a device name at the database boundary.

- probe: `npm run migrate:local -w @wx/collector && npm run test:unit -w @wx/collector -- db/measure.repository.test.ts`
- postcondition: a repository-created measurement stores its name, while a raw `measures` insert that omits `device_name` is rejected by the local PostgreSQL database.
- breakage: change the migration to set `DEFAULT 'UNKNOWN'` instead of dropping the default.

## Out of scope

- Deleting or backfilling existing `UNKNOWN` rows.
- Changing `device_type` storage.
- Changing `get_chart_history`.
- Changing the web dashboard.
