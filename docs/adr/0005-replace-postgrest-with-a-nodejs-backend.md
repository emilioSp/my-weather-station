---
type: ADR
id: 'ADR-005'
title: 'Replace PostgREST with a Node.js backend'
status: accepted
---

## Context

On November 25, 2026, Supabase PostgREST returned `HTTP 504 / PGRST003` for all three latest-reading requests. The dashboard could not load current readings or chart
history, but the collector continued writing directly to PostgreSQL. [R-11](../roadmap/r-11-replace-postgrest-with-a-small-nodejs-backend.md) records the incident. The
cause of the pool timeout is unknown.

## Decision

Replace PostgREST in the dashboard's read path with a small Node.js service. Use Knex to query the existing Supabase PostgreSQL database and call
`public.get_chart_history` directly. Leave the database and collector write path unchanged.

This supersedes [ADR-002](0002-postgresql-storage-with-separate-write-and-read-clients.md) for dashboard reads when the web app switches to the Node.js service.

## Consequences

- The web app will remove its Supabase client layer and read current measurements and chart history from the Node.js API.
- The Node.js service will own the call to the existing chart-history SQL function.
- The service needs a deployment location that can reach PostgreSQL. No hosting choice has been made.
