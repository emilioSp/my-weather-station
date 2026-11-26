---
type: ADR
id: 'ADR-002'
title: 'PostgreSQL storage with separate write and read clients'
status: active
---

## Context

Accepted by the owner during the constitution initialization interview. Implemented.

The BLE collector must persist measurements, and the web app must query current readings and chart history. The owner confirmed using PostgreSQL with separate clients
rather than maintaining a custom API server.

No other rejected database or hosting alternatives were confirmed.

## Decision

Use PostgreSQL as the common measurement store. The collector writes through Knex and the PostgreSQL driver. The web app reads through Supabase queries and the
`get_chart_history` RPC function. Do not introduce a separate custom API server for this existing workflow.

## Consequences

The web app depends on Supabase's API and the database's exposed schema and functions. The collector and web app must agree on stored-row contracts. Database permissions
must distinguish browser reads from collector writes; authorization is not delegated to a custom application server.

Owner confirmation during the initialization interview. See the [collector connection](../../packages/collector/db/db.ts),
[measurement repository](../../packages/collector/db/measure.repository.ts), [web API boundary](../../packages/web/supabase.api.ts), and
[browser privilege migration](../../packages/collector/migrations/20260828090836_restrict_anon_privileges.ts). These are repository implementation records, not
verification of a live deployment's database grants.
