---
type: Roadmap
id: 'R-03'
title: 'Switch temperature units'
status: removed
---

## Objective

Let the owner switch between Celsius and Fahrenheit on the dashboard.

## Completed When

Originally completed with Celsius and Fahrenheit selection and browser preference storage. The switch has since been removed at the owner's request; the dashboard now
always displays Celsius.

The owner confirmed acceptance during the constitution initialization interview. See the
[original implementation commit](https://github.com/emilioSp/my-weather-station/commit/c41a6f4). The [current dashboard](../../packages/web/views/WeatherStation.tsx) uses
Celsius only, without unit selection or conversion.
