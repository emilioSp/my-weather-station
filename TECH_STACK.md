# Tech stack

This document describes the technologies currently used, including development and deployment tools as requested by the owner. It does not introduce new mandatory
technology constraints. Dependency versions are recorded in the workspace manifests and lockfile.

## Runtime and workspaces

| Technology                        | Role                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Node.js 26                        | Runs the collector and tooling, including native TypeScript stripping and Temporal. [.nvmrc](.nvmrc) currently selects 26.7.0. |
| TypeScript and ECMAScript modules | Application source and type checking. The collector runs TypeScript directly; Vite bundles the web app.                        |
| npm workspaces                    | Manages the collector, web, and shared packages in one repository with a shared lockfile.                                      |
| Zod                               | Validates configuration and measurement data; shared domain types are inferred from schemas.                                   |

The [collector](packages/collector/package.json) owns BLE and database writes. The [web app](packages/web/package.json) owns browser code. The
[shared package](packages/shared/package.json) owns measurement schemas, database key mapping, and UUID normalization without Node or browser APIs.

## Collection and data storage

| Technology                           | Role                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| SwitchBot indoor and outdoor meters  | Supply measurements through Bluetooth Low Energy advertisements.       |
| `@stoprocent/noble`                  | Reads BLE advertisements in the collector.                             |
| PostgreSQL                           | Stores measurements and serves chart history through SQL functions.    |
| Knex and `pg`                        | Provide collector database access and schema migrations.               |
| Supabase and `@supabase/supabase-js` | Expose measurement queries and chart-history RPC calls to the browser. |
| Supabase CLI and Docker              | Run the local PostgreSQL and API stack for development and tests.      |

## Web interface

Browser date handling uses native `Date` and `Intl` for Safari compatibility, with explicit `Europe/Rome` formatting. Native Temporal is only used in the Node.js
collector; the web app does not need it or a polyfill. See [ADR-004](ADR.md#adr-004-use-date-and-intl-in-the-web-app-for-safari-compatibility).

| Technology          | Role                                                      |
| ------------------- | --------------------------------------------------------- |
| React and React DOM | Render the dashboard and manage browser UI state.         |
| Vite                | Provides the development server and production web build. |
| Tailwind CSS        | Styles the responsive interface.                          |
| Recharts            | Renders interactive measurement charts.                   |
| React Icons         | Provides configured meter icons.                          |

## Development and verification

| Technology                    | Role                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------- |
| TypeScript compiler           | Checks types across all three workspaces without emitting application JavaScript. |
| Vitest and V8 coverage        | Run unit and integration tests and collect coverage.                              |
| Playwright                    | Tests Chromium and WebKit; Chromium coverage is merged with unit coverage.        |
| Oxlint and `oxlint-anti-slop` | Enforce lint rules and project conventions.                                       |
| Local Oxlint plugin           | Validates static and interpolated Playwright test titles.                         |
| Oxfmt                         | Formats source, configuration, and documentation.                                 |
| GitHub Actions                | Runs pull request checks and deploys the web build.                               |

`npm run check` applies formatting and lint fixes, then checks types, tests, and coverage. See the [root scripts](package.json) and
[local lint rule](.oxlint/test-titles.js).

## Deployment

The [collector deployment guide](DEPLOY.md) targets a Raspberry Pi 3 running 64-bit Raspberry Pi OS. Its [Docker image](packages/collector/Dockerfile) uses Node.js and
Linux Bluetooth support.

The web app is built by Vite and deployed to GitHub Pages through the [deployment workflow](.github/workflows/deploy-web.yml).
