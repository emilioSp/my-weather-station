# 20261127-164829-switch-the-dashboard-to-the-node-js-weather-api: Switch the dashboard to the Node.js weather API

## Problem

The dashboard still reads measurements through PostgREST, even though the Node.js API is deployed on Render.

## Goal and scope

Move dashboard reads to the Node.js API in development and production. Configure its base URL through the web app's environment and use one shared snake_case measurement type across the collector, API, and web app without translating measurement keys.

## Out of scope

- Changes to BLE collection, the database schema, the rate limits, and the dashboard's appearance.
- Automated tests that assert the removed key converter files or exports are absent.

See [spec.md](spec.md) for the required behavior.
