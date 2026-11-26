---
type: ADR
id: 'ADR-004'
title: 'Use Date and Intl in the web app for Safari compatibility'
status: active
---

## Context

Accepted by the owner after a Safari compatibility failure. Implemented.

The web app used native Temporal for timestamps, date formatting, history ranges, and loading deadlines. The owner's Safari failed with
`ReferenceError: Can't find variable: Temporal`. The browser checks ran only in Chromium and did not catch this compatibility gap.

Temporal support in JavaScriptCore or Safari Technology Preview does not guarantee availability in the owner's stable Safari.

## Decision

Use native `Date` and `Intl.DateTimeFormat` in `packages/web` instead of Temporal. The owner explicitly chose this approach over adding a Temporal polyfill.

Parse database timestamps as instants, calculate history ranges in elapsed milliseconds, and serialize query bounds as UTC ISO strings. Keep dashboard dates in
`Europe/Rome`, with the existing English formats and daylight saving behavior. Use `Date.now()` for loading deadlines.

Keep Temporal in the Node.js collector. This decision does not change stored-row schemas or database contracts.

## Consequences

The web app no longer requires native Temporal support and adds no dependency. Browser timestamps use Date's millisecond precision. Do not use browser-local time for Rome
date displays or local calendar arithmetic for history windows.

Run the existing browser tests in Chromium and WebKit, Safari's browser engine, to check compatibility.

The owner requested Date in the web UI and an ADR because of Safari. See the [date formatter](../../packages/web/utils/formatMeasuredAt.util.ts),
[history query boundary](../../packages/web/supabase.api.ts), [dashboard hook](../../packages/web/hooks/useWeatherStation.ts), and
[browser date tests](../../packages/web/tests/ui/metric-extreme-dates.spec.ts).
