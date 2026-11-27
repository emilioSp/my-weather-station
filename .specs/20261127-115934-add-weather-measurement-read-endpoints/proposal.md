# 20261127-115934-add-weather-measurement-read-endpoints: Add weather measurement read endpoints

## Problem

The dashboard reads through PostgREST. When its connection pool timed out, the dashboard could not load readings even though the collector could still write directly to PostgreSQL.

## Goal and scope

Prepare the server side of [R-11](../../docs/roadmap/r-11-replace-postgrest-with-a-small-nodejs-backend.md) and follow [ADR-005: Replace PostgREST with a Node.js backend](../../docs/adr/0005-replace-postgrest-with-a-nodejs-backend.md). Add read-only endpoints for the latest measurement and chart history to the existing Node.js API.

## Out of scope

- Switching the dashboard to the new API, including removing the Supabase client module or changing the hook.
- Changing the existing SQL function, collector, database schema, or sample API route.
- Choosing or changing a deployment platform.

See [spec.md](spec.md) for behavior and [design.md](design.md) for design decisions.
