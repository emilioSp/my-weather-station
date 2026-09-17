# Builder observations

## Resumed pass after escalation.3

The owner-approved probes use the collector and workspace `test:unit` scripts.

## AC1

Breakage applied: removed `deviceName` from the insert object in `packages/collector/db/measure.repository.ts`.

Probe: `npm run test:unit -w @wx/collector -- db/measure.repository.test.ts`

Output: exit 1. Vitest reported 2 tests with 1 failure. The returned measure contained `deviceName: "UNKNOWN"` instead of `"repository meter"`; the raw-insert default assertion passed.

Restored probe: `npm run test:unit -w @wx/collector -- db/measure.repository.test.ts`

Output: exit 0. Vitest reported `Test Files 1 passed (1)` and `Tests 2 passed (2)`.

The passing tests observed a repository-created row with its configured name and a raw insert reading `UNKNOWN`.

## AC2

Breakage applied: omitted `deviceName: this.meter.deviceName` from the `storeMeasure` input in `packages/collector/meters/Meter.ts`.

Probe: `npm run test:unit -w @wx/collector -- environment.test.ts meters/Meter.test.ts`

Output: exit 1. Vitest reported 7 tests with 2 failures. Both meter storage assertions received `deviceName: "UNKNOWN"` instead of the configured indoor or outdoor name; the environment validation assertions passed.

Restored probe: `npm run test:unit -w @wx/collector -- environment.test.ts meters/Meter.test.ts`

Output: exit 0. Vitest reported `Test Files 2 passed (2)` and `Tests 7 passed (7)`.

The passing tests observed rejection of blank and duplicate device names and meter-created rows carrying their configured names.

## AC3

Breakage applied: removed `deviceName` from `measureSchema` in `packages/shared/types.ts`.

Probe: `npm run test:unit -w @wx/shared && npm run test:unit -w @wx/web -- supabase.api.test.ts`

Output: exit 1. The shared suite reported 8 tests with 1 failure: the complete-measure assertion received `undefined` for `deviceName`. The web command was not run because of `&&`.

Restored probe: `npm run test:unit -w @wx/shared && npm run test:unit -w @wx/web -- supabase.api.test.ts`

Output: exit 0. The shared suite reported `Test Files 2 passed (2)` and `Tests 8 passed (8)`. The web suite reported `Test Files 1 passed (1)` and `Tests 2 passed (2)`.

The real Supabase API assertions observed `deviceName` on the latest direct-measures response and on both chart-history arrays.

## Migration reverse path

`npm run rollback:local -w @wx/collector` output: `Batch 2 rolled back: 2 migrations`.

After rollback, the database inspection output was `{"column_exists":false,"column_is_required_with_default":false,"function_selects_measure_columns":false}`.

`npm run migrate:local -w @wx/collector` output: `Batch 2 run: 2 migrations`.

After reapplying, the database inspection output was `{"column_exists":true,"column_is_required_with_default":true,"function_selects_measure_columns":true}`.

## Required checks

`npm run lint` output: `Checked 103 files in 46ms. No fixes applied.` (exit 0).

`npm run build` output: collector and shared `tsc` builds passed; the web TypeScript and Vite production build passed. Vite emitted its existing warning about chunks larger than 500 kB (exit 0).
