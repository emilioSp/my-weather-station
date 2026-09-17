# 01a0b06fcbc8-four-meter-dashboard: Show four meters in the dashboard

## Problem

The collector stores measurements for two new meters: `living room` and `bedroom`.

The web app must show all four configured meters in the current-readings area after the header. Each meter must have a clear, unique colour. The card and history header must show a pulsing colour circle, the sensor name, and a white device icon.

## Constraints

- Do not add dependencies.
- Do not change collector code, database code, or stored measurements.
- Keep the range label, Zoom out button, and Zoom in button unchanged in appearance, order, and behaviour.
- Keep the refresh action and temperature-unit control unchanged.
- Keep the current-reading metrics: temperature, humidity, dew point, heat index, battery, and signal.
- Keep the existing responsive DOM structure. At smaller viewports, cards may stack only.
- Configure the devices in this order: `garden`, `kitchen`, `living room`, `bedroom`.
- Use these React Icons exports:
  - garden: `FaSeedling`
  - kitchen: `FaKitchenSet`
  - living room: `FaCouch`
  - bedroom: `FaBed`
- Use four distinct meter colours. The colours are green for garden, cyan for kitchen, orange for living room, and purple for bedroom.

## Allowed paths

- `packages/web/.env`
- `packages/web/.env.prod`
- `packages/web/environment.ts`
- `packages/web/environment.test.ts`
- `packages/web/components/weather-station/WeatherCard.tsx`
- `packages/web/components/weather-station/MeasurementHistory.tsx`
- `packages/web/components/weather-station/MeterAccordion.tsx`
- `packages/web/components/weather-station/LinearChart.tsx`
- `packages/web/hooks/useWeatherStation.test.ts`
- `packages/web/styles.css`
- `packages/web/e2e/weather-station.spec.ts`
- `packages/web/e2e/temperature-units.spec.ts`
- `.specs/01a0b06fcbc8-four-meter-dashboard/**`

## Prototype

The visual reference is:

- `.specs/01a0b06fcbc8-four-meter-dashboard/prototypes/four-meter-dashboard.html`

The reference applies to the four current-reading cards and the meter accordion headers. It does not change the range controls or chart content.

## Technical details

Add the two new devices to both web environment files. Extend the static icon map and configuration test for the four approved icons.

The first content area after the header is the current-readings grid. It shows all four cards. At 1280 px, show four cards in one row. At 768 px, show two cards per row. At 390 px, show one card per row.

Use the configured device order to select one meter theme. A theme supplies the card colour, the pulsing circle colour, and the chart line colour. Do not repeat a theme for these four meters.

In each card heading, show the pulsing colour circle first, then the sensor name, then its white configured icon. The circle is decorative. Disable its animation when the user requests reduced motion.

Pass the configured icon and meter theme to each history accordion. Its button uses the same heading order: pulsing colour circle, sensor name, then white icon. Keep the existing chevron at the right edge.

Update the E2E fixtures and assertions for all four configured devices. Check the overview cards, configured icons, and history accordions. Keep the existing range-control checks unchanged.

During builder and verifier passes, render the prototype and the app at 1280 × 700, 768 × 1024, and 390 × 844. Compare the current-reading cards and accordion headers. Record the commands, screenshot paths, and comparison in the required observations or handoff files.

## Acceptance criteria

### AC1: Both web configurations define the four approved meters and icons.

- probe: `npm run test:unit -w @wx/web -- environment.test.ts`
- postcondition: configuration validation returns `garden` with `FaSeedling`, `kitchen` with `FaKitchenSet`, `living room` with `FaCouch`, and `bedroom` with `FaBed`, in that order.
- breakage: set the kitchen icon to `FaHouse` or remove `bedroom` from either environment file.

### AC2: The dashboard shows four current-reading cards and four meter history accordions.

- probe: `npm run test:e2e -w @wx/web -- weather-station.spec.ts temperature-units.spec.ts`
- postcondition: mocked measurements for garden, kitchen, living room, and bedroom show one current-reading card and one history accordion per configured meter. Each card and accordion heading shows its configured icon. The existing range label, Zoom out button, and Zoom in button still work.
- breakage: remove `living room` from the current-readings or history device loop, or replace the kitchen icon with a fixed house icon.

### AC3: Meter identity follows the approved visual reference at all target viewports.

- probe: `npm run test:e2e -w @wx/web -- weather-station.spec.ts`
- postcondition: at 1280 × 700, 768 × 1024, and 390 × 844, the cards use four distinct meter colours and lay out as four, two, and one card per row. Each card and accordion heading shows a coloured pulsing circle, its sensor name, and a white icon in that order. The page has no horizontal scroll at 390 px.
- breakage: reuse the garden theme for bedroom, place a device icon before its name, remove the pulsing circle, or give the icon the meter colour.

## Out of scope

- Changes to the collector, database schema, queries, or migrations.
- Changes to the range controls, available ranges, or zoom behaviour.
- Changes to refresh, temperature units, measurement calculations, or displayed metrics.
- New meter configuration fields or a device-management UI.
