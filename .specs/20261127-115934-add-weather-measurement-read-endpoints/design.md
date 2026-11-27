# 20261127-115934-add-weather-measurement-read-endpoints: Add weather measurement read endpoints

## Decisions

- Use the existing [Hono API](../../packages/api/src/app.ts) and [shared Knex client](../../packages/shared/db.ts). Read the latest row directly from PostgreSQL for [REQ1](spec.md#req1-the-api-must-return-the-latest-measurement-for-the-requested-device).
- For [REQ2](spec.md#req2-the-api-must-return-chart-history-grouped-by-device-for-the-effective-date-range), call the existing [`public.get_chart_history(p_start, p_end)`](../../packages/shared/migrations/20260917151544_get_chart_history_by_device_name.ts) function through Knex. Reuse its grouping and downsampling without going through PostgREST.
- Validate query inputs with Zod. Resolve the date limits in Node before calling SQL, so [REQ3](spec.md#req3-the-api-must-resolve-the-effective-chart-history-range) is explicit in the service. Leave the SQL function unchanged while the dashboard still calls it through PostgREST.
- Do not apply the shared camelCase mapper to either response.
