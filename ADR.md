# Architecture decision records

These records describe architectural choices explicitly confirmed by the owner. The first three were recorded during constitution initialization; their original adoption
dates and a complete history of evaluated alternatives are not recorded.

Accepted decisions and roadmap priorities are separate. A planned change is not permission to implement it.

## ADR-001: Separate workspaces with shared domain code

### Status

Accepted by the owner during the constitution initialization interview. Implemented.

### Context

The collector and web app use the same stored measurement data, but only the collector needs BLE and Node APIs, while the web app needs browser APIs. They need consistent
measurement schemas and database key mapping without mixing platform-specific code.

The owner confirmed this separation and the reason for sharing domain code. No rejected alternative repository layouts were confirmed.

### Decision

Keep the collector, web app, and platform-neutral shared code in one npm workspace repository. The shared package owns measurement schemas, database key mapping, and UUID
normalization. Consumers import it by package name.

### Consequences

Both apps use a common data contract and mapping logic. Shared schema changes can affect both apps and must be checked across workspaces. BLE and browser APIs remain
outside the shared package.

### Evidence

Owner confirmation during the initialization interview. See the [root workspace manifest](package.json), [shared schemas](packages/shared/types.ts),
[shared compiler configuration](packages/shared/tsconfig.json), and [repository guidelines](AGENTS.md).

## ADR-002: PostgreSQL storage with separate write and read clients

### Status

Accepted by the owner during the constitution initialization interview. Implemented.

### Context

The BLE collector must persist measurements, and the web app must query current readings and chart history. The owner confirmed using PostgreSQL with separate clients
rather than maintaining a custom API server.

No other rejected database or hosting alternatives were confirmed.

### Decision

Use PostgreSQL as the common measurement store. The collector writes through Knex and the PostgreSQL driver. The web app reads through Supabase queries and the
`get_chart_history` RPC function. Do not introduce a separate custom API server for this existing workflow.

### Consequences

The web app depends on Supabase's API and the database's exposed schema and functions. The collector and web app must agree on stored-row contracts. Database permissions
must distinguish browser reads from collector writes; authorization is not delegated to a custom application server.

### Evidence

Owner confirmation during the initialization interview. See the [collector connection](packages/collector/db/db.ts),
[measurement repository](packages/collector/db/measure.repository.ts), [web API boundary](packages/web/supabase.api.ts), and
[browser privilege migration](packages/collector/migrations/20260828090836_restrict_anon_privileges.ts). These are repository implementation records, not verification of
a live deployment's database grants.

## ADR-003: Strategy pattern for different kinds of meters

### Status

Accepted by the owner during the constitution initialization interview. Implemented for indoor and outdoor SwitchBot meters.

### Context

Different kinds of meters advertise data in different formats. Their decoding differs, while scanning retries, derived measurements, and storage follow a shared workflow.

The owner explicitly requested recording the Strategy pattern as the approach for supporting different kinds of meters. No rejected implementation alternatives were
confirmed.

### Decision

Use the **Strategy pattern to support different kinds of meters**. Each meter kind has a strategy for its data format. The factory selects the strategy from the
configured meter type. The shared `Meter` base class handles scanning retries, derived measurements, and persistence.

### Consequences

Meter-specific decoding stays separate from the shared reading workflow. Adding a new kind of meter requires its strategy and corresponding factory and configuration
schema support. A new strategy does not itself approve support for another meter or authorize implementation.

### Evidence

Owner confirmation during the initialization interview, including the explicit request to name the Strategy pattern. See the
[factory](packages/collector/meters/meter.factory.ts), [shared workflow](packages/collector/meters/Meter.ts), [indoor strategy](packages/collector/meters/IndoorMeter.ts),
and [outdoor strategy](packages/collector/meters/OutdoorMeter.ts).

## ADR-004: Use Date and Intl in the web app for Safari compatibility

### Status

Accepted by the owner after a Safari compatibility failure. Implemented.

### Context

The web app used native Temporal for timestamps, date formatting, history ranges, and loading deadlines. The owner's Safari failed with
`ReferenceError: Can't find variable: Temporal`. The browser checks ran only in Chromium and did not catch this compatibility gap.

Temporal support in JavaScriptCore or Safari Technology Preview does not guarantee availability in the owner's stable Safari.

### Decision

Use native `Date` and `Intl.DateTimeFormat` in `packages/web` instead of Temporal. The owner explicitly chose this approach over adding a Temporal polyfill.

Parse database timestamps as instants, calculate history ranges in elapsed milliseconds, and serialize query bounds as UTC ISO strings. Keep dashboard dates in
`Europe/Rome`, with the existing English formats and daylight saving behavior. Use `Date.now()` for loading deadlines.

Keep Temporal in the Node.js collector. This decision does not change stored-row schemas or database contracts.

### Consequences

The web app no longer requires native Temporal support and adds no dependency. Browser timestamps use Date's millisecond precision. Do not use browser-local time for Rome
date displays or local calendar arithmetic for history windows.

Run the existing browser tests in Chromium and WebKit, Safari's browser engine, to check compatibility.

### Evidence

The owner requested Date in the web UI and an ADR because of Safari. See the [date formatter](packages/web/utils/formatMeasuredAt.util.ts),
[history query boundary](packages/web/supabase.api.ts), [dashboard hook](packages/web/hooks/useWeatherStation.ts), and
[browser date tests](packages/web/e2e/metric-extreme-dates.spec.ts).
