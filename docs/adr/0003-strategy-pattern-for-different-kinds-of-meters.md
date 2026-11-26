---
type: ADR
id: 'ADR-003'
title: 'Strategy pattern for different kinds of meters'
status: active
---

## Context

Accepted by the owner during the constitution initialization interview. Implemented for indoor and outdoor SwitchBot meters.

Different kinds of meters advertise data in different formats. Their decoding differs, while scanning retries, derived measurements, and storage follow a shared workflow.

The owner explicitly requested recording the Strategy pattern as the approach for supporting different kinds of meters. No rejected implementation alternatives were
confirmed.

## Decision

Use the **Strategy pattern to support different kinds of meters**. Each meter kind has a strategy for its data format. The factory selects the strategy from the
configured meter type. The shared `Meter` base class handles scanning retries, derived measurements, and persistence.

## Consequences

Meter-specific decoding stays separate from the shared reading workflow. Adding a new kind of meter requires its strategy and corresponding factory and configuration
schema support. A new strategy does not itself approve support for another meter or authorize implementation.

Owner confirmation during the initialization interview, including the explicit request to name the Strategy pattern. See the
[factory](../../packages/collector/meters/meter.factory.ts), [shared workflow](../../packages/collector/meters/Meter.ts),
[indoor strategy](../../packages/collector/meters/IndoorMeter.ts), and [outdoor strategy](../../packages/collector/meters/OutdoorMeter.ts).
