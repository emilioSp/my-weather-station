---
type: Roadmap
id: 'R-04'
title: 'Date chart lows and highs'
status: completed
---

## Objective

Show when chart lows and highs were measured.

## Completed When

Temperature, humidity, and dew point charts show the measurement dates for their lows and highs.

The owner confirmed acceptance during the constitution initialization interview. See the
[implementation commit](https://github.com/emilioSp/my-weather-station/commit/52b4944),
[specification](../../.specs/20261006-204022-show-measurement-dates-for-metric-lows-and-highs/spec.md), and
[browser tests](../../packages/web/tests/ui/metric-extreme-dates.spec.ts). The specification workflow still says `candidate-ready`; acceptance here comes from the owner's
explicit confirmation, not that workflow status.
