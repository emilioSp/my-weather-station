---
type: Roadmap
id: 'R-07'
title: 'Adapt the UI to the Raspberry Pi touchscreen'
status: completed
---

## Objective

Adapt the dashboard to the owner's 7-inch 1024×714 IPS LCD HDMI capacitive touchscreen.

See the [specification](../../.specs/20261102-212145-adapt-the-ui-to-the-raspberry-pi-touchscreen/spec.md).

## Completed When

The dashboard displays three meter cards in one row at 1024×714, with always-visible history charts, card navigation to each meter's history, and scroll-to-top buttons.
The default history range is three days. Documentation and visual snapshots use the touchscreen's target resolution.

The owner confirmed completion. See the [responsive styles](../../packages/web/styles.css),
[history charts](../../packages/web/components/weather-station/HistoryChart.tsx), [reading cards](../../packages/web/components/weather-station/WeatherCard.tsx), and
[visual tests](../../packages/web/tests/visual/dashboard.visual.spec.ts).
