---
type: ADR
id: 'ADR-001'
title: 'Separate workspaces with shared domain code'
status: active
---

## Context

Accepted by the owner during the constitution initialization interview. Implemented.

The collector and web app use the same stored measurement data, but only the collector needs BLE and Node APIs, while the web app needs browser APIs. They need consistent
measurement schemas and database key mapping without mixing platform-specific code.

The owner confirmed this separation and the reason for sharing domain code. No rejected alternative repository layouts were confirmed.

## Decision

Keep the collector, web app, and platform-neutral shared code in one npm workspace repository. The shared package owns measurement schemas, database key mapping, and UUID
normalization. Consumers import it by package name.

## Consequences

Both apps use a common data contract and mapping logic. Shared schema changes can affect both apps and must be checked across workspaces. BLE and browser APIs remain
outside the shared package.

Owner confirmation during the initialization interview. See the [root workspace manifest](../../package.json), [shared schemas](../../packages/shared/types.ts),
[shared compiler configuration](../../packages/shared/tsconfig.json), and [repository guidelines](../../AGENTS.md).
