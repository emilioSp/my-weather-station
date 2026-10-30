# Mission

My Weather Station helps the owner understand indoor and outdoor conditions at home by collecting, storing, and displaying measurements from the owner's SwitchBot meters.

## Intended user and responsibility

This is a personal application for the owner, not a product for other people to set up. Meter configuration and deployment remain operator tasks, documented in
[README.md](README.md) and [DEPLOY.md](DEPLOY.md).

## Current scope

The application collects meter readings, preserves their history, and presents current and historical conditions in a web interface.

Forecasts, alerts, and device control are outside the current scope. Forecasts and alerts are possible future additions, not current commitments. See
[ROADMAP.md](ROADMAP.md) for these and the other deferred ideas.

## Evidence

The owner confirmed the personal purpose and current scope during the constitution initialization interview. The collection, storage, and display workflow is implemented
in the [collector](packages/collector/index.ts) and [web app](packages/web/views/WeatherStation.tsx).
