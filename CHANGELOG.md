# Changelog

This initial changelog summarizes meaningful committed changes from 3 September 2026 through 30 October 2026, reviewed in Git ancestry range `c41a6f4^..fb67f05`. Earlier
history is intentionally omitted.

There are no release tags in the inspected history. Dated sections use commit dates, not release or publication dates. Routine maintenance and version-only changes are
omitted.

## Unreleased

Aligned source with the coding conventions: explicit shared utility subpaths, one primary operation per module, class-based database and Supabase singletons, named input
shapes, assertion helpers, and scenario fixtures. Removed redundant tests and branch-built heat-index state. Database schemas and stored measurement shapes are unchanged.

TypeScript API compatibility: import shared functions from `@wx/shared/utils/<module>.ts`; the package root exposes schemas, types, and domain constants. Use the database
singleton's `getClient()` and `close()` methods and the default Supabase singleton's query methods. Web history query inputs use `Date` values.

Replaced Temporal in the web app with native `Date` and `Intl` after Safari failed without Temporal support. Rome date formats and elapsed history ranges are unchanged;
the collector still uses Temporal. No polyfill or dependency was added. See [ADR-004](ADR.md#adr-004-use-date-and-intl-in-the-web-app-for-safari-compatibility).

Initialized the mission, tech stack, roadmap, changelog, and architecture decision records through an owner interview.

## 2026-10-30

Replaced Biome with Oxfmt for formatting and Oxlint for linting. Added static and interpolated Playwright title validation, standardized test descriptions, typed mocks,
and corrected missing or conditional assertions. See the [tooling migration](https://github.com/emilioSp/my-weather-station/commit/69534d1).

Developer command compatibility: `lint:fix` and `lint:anti-slop` were removed. Use `npm run fmt` and `npm run lint`; `lint` applies fixes, and `npm run check` applies
formatting and lint fixes before type checks, tests, and coverage. These are tooling changes, not application API changes.

## 2026-10-29

Updated the configured meters and dashboard grid. See the [web configuration and layout change](https://github.com/emilioSp/my-weather-station/commit/cfedb50) and
[collector configuration change](https://github.com/emilioSp/my-weather-station/commit/50e485a).

## 2026-10-06

Added measurement dates to chart lows and highs, including earliest-date selection for tied extremes, range and refresh updates, and preserved dates when changing
temperature units. See the [implementation](https://github.com/emilioSp/my-weather-station/commit/52b4944) and
[specification](.specs/20261006-204022-show-measurement-dates-for-metric-lows-and-highs/spec.md).

Added Oxlint anti-slop validation and simplified the agent workflow, removing the earlier native pre-commit hook and its `precommit` script. See the
[workflow change](https://github.com/emilioSp/my-weather-station/commit/6358d90).

## 2026-09-17

Added stored device names and changed current-reading and history queries to use configured names. Expanded the dashboard to display multiple named meters with distinct
themes. See the commits for [storage](https://github.com/emilioSp/my-weather-station/commit/d3dd9db),
[queries](https://github.com/emilioSp/my-weather-station/commit/8e6044b), and [display](https://github.com/emilioSp/my-weather-station/commit/26d999d).

Compatibility: collector devices require unique, nonblank `deviceName` values. Web `VITE_DEVICES` entries must use matching names and supported icons. The SQL migrations
added `device_name` with an initial `UNKNOWN` default and then removed that default. Apply the existing Knex migrations using the commands in [README.md](README.md).
Chart history now uses device-name keys instead of device-type keys.

## 2026-09-16

Combined browser and unit-test coverage for the web app, expanded browser scenarios, and raised coverage thresholds. See the
[coverage integration](https://github.com/emilioSp/my-weather-station/commit/e8da374) and
[expanded verification](https://github.com/emilioSp/my-weather-station/commit/615b8ee).

## 2026-09-15

Moved the collector and web workspaces from `apps/` to `packages/` and updated build and tooling paths. Use the documented workspace names and current paths. See the
[workspace relocation](https://github.com/emilioSp/my-weather-station/commit/9cf94d7).

Fixed outdoor-meter decoding by removing an overly specific manufacturer-data byte check. See the
[decoder fix](https://github.com/emilioSp/my-weather-station/commit/86a06a4).

Added Vitest coverage for collector, shared, and web behavior, including database integration and pull request checks. See the
[test additions](https://github.com/emilioSp/my-weather-station/commit/f10518a).

Added a native pre-commit validation hook. It was subsequently removed on 6 October 2026. See the
[hook addition](https://github.com/emilioSp/my-weather-station/commit/c263692).

## 2026-09-03

Added Celsius/Fahrenheit switching for current readings and chart temperature displays, with browser preference persistence. See the
[implementation](https://github.com/emilioSp/my-weather-station/commit/c41a6f4).
