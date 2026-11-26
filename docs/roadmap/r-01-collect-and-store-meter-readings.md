---
type: Roadmap
id: 'R-01'
title: 'Collect and store meter readings'
status: completed
---

## Objective

Collect and store readings from indoor and outdoor SwitchBot meters.

## Completed When

The collector reads indoor and outdoor SwitchBot meters, calculates derived weather values, and stores complete measurements in PostgreSQL.

The owner confirmed acceptance during the constitution initialization interview. See the [collector entrypoint](../../packages/collector/index.ts),
[meter workflow](../../packages/collector/meters/Meter.ts), and [measurement repository](../../packages/collector/repository/measure.repository.ts).
