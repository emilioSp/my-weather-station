# 20261127-164829-switch-the-dashboard-to-the-node-js-weather-api: Switch the dashboard to the Node.js weather API

## Decisions

- Use the stored row's snake_case shape for the single `Measure` in `@wx/shared`. Keep the API's existing wire format and remove case conversion from the stored-measurement path. BLE inputs and device configuration are not stored measurements and keep their names. See [REQ3](spec.md#req3-the-collector-api-and-web-app-must-use-one-shared-snake_case-measure-type) and [REQ5](spec.md#req5-the-collector-must-return-stored-measurements-with-their-database-field-names).
- Put the new frontend HTTP client in `packages/web/api/` and delete `packages/web/supabase.api.ts`. See [REQ1](spec.md#req1-the-dashboard-must-read-current-measurements-and-chart-history-from-the-nodejs-api).
- Keep the API public: no origin allowlist or authentication. Return `Access-Control-Allow-Origin: *` so browsers can read responses, including `429`. Keep the existing production rate limiter and middleware order from [ADR-005](../../docs/adr/0005-replace-postgrest-with-a-nodejs-backend.md#public-api-and-naive-rate-limiting).

## Contracts

### Shared Measure

Update `measureSchema` in `packages/shared/types.ts` to validate these snake_case fields. Keep `Measure` inferred from that Zod schema; the type below shows the exact shape, not a second declaration. Keep the collector's separate BLE and configuration schemas unchanged.

```ts
type Measure = {
  id: string;
  device_id: string | null;
  device_type: MeterType;
  device_name: string;
  address: string | null;
  measured_at: string;
  temperature: number;
  humidity: number;
  dew_point: number;
  heat_index: number;
  battery: number;
  signal_power_dbm: number;
};
```

## Risks and limits

- Deploy the API's CORS change to Render before switching GitHub Pages to it. The current JSON shape does not need a compatibility migration.
