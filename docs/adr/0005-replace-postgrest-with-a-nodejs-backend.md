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

### Public API and naive rate limiting

The API is publicly accessible without login. The owner accepted a simple in-memory rate limiter in Hono because the dashboard is a small personal project. This is a
deliberate trade-off: it limits abuse from individual clients without adding infrastructure, but it does not stop distributed floods or protect the network or Node.js
process from being overwhelmed.

The rate limiter must be the first Hono middleware to run, before request validation, route handlers, or database access. It checks whether the request is within its
client IP's quota; it does not authenticate the caller. If the API runs behind a proxy, use client IP information only from a trusted proxy.

- `/get-latest-measure`: 15 requests per IP per minute.
- `/get-chart-history`: 5 requests per IP per minute.
- Requests over either quota receive HTTP 429 (Too Many Requests).

Enable the limiter only in production. These are starting limits for a single API instance, and the counters are local to that instance.

There is no concurrency cap across clients for chart-history queries. The owner chose to keep the API simple because this is a small personal dashboard and the risk of a
coordinated attack is considered low. Requests from multiple IPs can still run history queries concurrently.

## Consequences

- The web app will remove its Supabase client layer and read current measurements and chart history from the Node.js API.
- The Node.js service will own the call to the existing chart-history SQL function.
- The service needs a deployment location that can reach PostgreSQL. No hosting choice has been made.
