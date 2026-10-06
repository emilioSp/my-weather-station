# Show measurement dates for metric lows and highs

## 1. Context, goals, and scope

Users need the measurement date for each Low and High value in the history charts.
The change covers temperature, humidity, and dew point for each displayed sensor.

### Out of scope

Do not add extremes to current-reading cards or add metrics.
Do not change database schemas, history API contracts, chart sampling, or range boundaries.
Other existing date displays keep their current format.

## 2. Requirements and constraints

Each Low and High value must show its measurement date and time below the value.
Dates remain visible without hover or touch on desktop, tablet, and smartphone.
They must not be clipped or cause horizontal page overflow at the target sizes in AC1.
Use a 13px font size, matching the date below `Latest available measurement`.

Use `Europe/Rome`, English day and abbreviated month, and 24-hour hours and minutes.
Do not show seconds or year. Example: `06 Oct · 14:35`.

Select the measurement from the same sensor and metric in the data currently used to calculate its chart extremes.
Use these data before client chart sampling.
Compare original values, not rounded display values.
For repeated extremes, select the earliest available measurement by time, regardless of input order.
Dates must follow the data after a range change or a successful refresh that changes history.
Switching temperature units must not change the selected measurement dates.

If only one measurement exists, Low and High share its date.
If no measurements exist, show no measurement dates and keep the current empty-chart state and Low/High placeholders.
Existing extreme values and their unit formatting remain unchanged.

## 3. Technical decisions and prototypes

### Data boundary

Keep this change inside the web workspace. History rows already contain `measuredAt`.
`packages/web/components/weather-station/LinearChart.tsx` calculates extremes before client chart sampling.
`packages/web/weather-dashboard.util.ts` currently returns only their numeric values.

The history function retains complete rows for metric extremes and selects earlier dates for ties when it reduces rows.
See `packages/collector/migrations/20260917151544_get_chart_history_by_device_name.ts`.
Dates refer to available history rows, not measurements omitted by existing server sampling or range filtering.
The deployed database function has not been inspected.

### Approved visual prototype

Open [the HTML prototype](prototypes/index.html) to preview desktop, tablet, and smartphone sizes.
It includes populated, single-measurement, and empty states, plus a working temperature unit switch.
Static previews: [desktop](prototypes/desktop.png), [tablet](prototypes/tablet.png), and [smartphone](prototypes/smartphone.png).

The approved layout places a muted date below each Low and High value.
Desktop keeps the summaries beside the metric title. Smartphone places them below the title.
The page previews the history section, not the complete dashboard.
Chart drawings and data are illustrative. Chart interactions and history loading are not implemented.
Fonts match the app when Google Fonts is available. Offline rendering uses fallback fonts.

## 4. Acceptance criteria

### AC1: Dates remain visible without interaction

1. Probe: Open a sensor history section at 1280 × 700, 768 × 1024, and 390 × 844. Observe each metric without hover or touch.
2. Expected result: Both dates appear below their values without clipping or horizontal page overflow.
3. Example: A chart has Low 18.0°C at `2026-10-06T06:15:42Z` and High 25.0°C at `2026-10-06T12:35:20Z`. At each size, `06 Oct · 08:15` and `06 Oct · 14:35` are visible below their respective values.

### AC2: Dates use the approved format and time zone

1. Probe: Load winter and summer measurements that cross midnight in Rome. Observe their extreme dates.
2. Expected result: Dates use Rome time, English day and abbreviated month, and hours and minutes without seconds or year.
3. Example: Measurements at `2026-01-06T23:35:59Z` and `2026-07-06T23:35:59Z` display `07 Jan · 00:35` and `07 Jul · 01:35`, respectively.

### AC3: Dates identify each sensor's correct metric extremes

1. Probe: Load two sensors with different values and dates. Observe all three metric summaries. Also observe a sensor with only one measurement.
2. Expected result: Each date belongs to the measurement that supplies that sensor's corresponding metric extreme.
3. Example: Sensor A has rows at `2026-10-06T06:00:00Z` with temperature 18, humidity 70, dew point 12, and at `2026-10-06T08:00:00Z` with temperature 25, humidity 40, dew point 8. Its temperature Low/High dates are `06 Oct · 08:00` / `06 Oct · 10:00`. Humidity and dew point Low/High dates are `06 Oct · 10:00` / `06 Oct · 08:00`. Sensor B has one row at `2026-10-06T09:00:00Z` with temperature 20, humidity 50, dew point 10. All its Low and High dates are `06 Oct · 11:00`.

### AC4: Repeated extremes select the earliest available date

1. Probe: Supply repeated low and high values in nonchronological order for each metric. Observe their dates.
2. Expected result: Each repeated extreme shows its earliest available measurement date.
3. Example: Supply temperature rows in this order: 25 at `2026-10-06T10:00:00Z`, 18 at `2026-10-06T08:00:00Z`, 25 at `2026-10-06T09:00:00Z`, and 18 at `2026-10-06T06:00:00Z`. Low shows `06 Oct · 08:00`, and High shows `06 Oct · 11:00`. With humidity values 70, 40, 70, 40 and dew point values 12, 8, 12, 8 at the same respective times, their Low and High dates are identical to the temperature dates.

### AC5: Dates follow a range change

1. Probe: Load a day of history with an older minimum. Switch from Last day to Last 6 hours.
2. Expected result: Dates identify extremes only from the data used for the newly selected range.
3. Example: History ends at `2026-10-06T12:00:00Z` and contains temperatures 10 at `2026-10-05T20:00:00Z`, 18 at `2026-10-06T08:00:00Z`, and 25 at the end. Low changes from `05 Oct · 22:00` to `06 Oct · 10:00` after the range switch.

### AC6: Dates follow refreshed history

1. Probe: Load history, then refresh with changed latest readings and a new history extreme.
2. Expected result: The affected date identifies the extreme in the refreshed history.
3. Example: High is initially 25°C at `2026-10-06T10:00:00Z`. Refresh returns a new latest row and history with 26°C at `2026-10-06T12:00:00Z`. High then shows `06 Oct · 14:00` instead of `06 Oct · 12:00`.

### AC7: Unit changes preserve measurement dates

1. Probe: Observe extremes for all three metrics, then switch from Celsius to Fahrenheit.
2. Expected result: Existing unit conversion applies without changing any extreme dates.
3. Example: Low temperature 18.0°C and dew point 8.0°C at `2026-10-06T06:00:00Z` become 64.4°F and 46.4°F. Both dates remain `06 Oct · 08:00`. Humidity Low 40% at that time remains 40% with `06 Oct · 08:00`.

### AC8: Empty charts show no measurement dates

1. Probe: Load an empty history array for a displayed sensor. Observe its three charts.
2. Expected result: Each chart keeps its empty state and Low/High placeholders without measurement dates.
3. Example: Sensor A has no rows in Last 6 hours. Its three charts show `No measurements in this range.` and the existing Low/High placeholders. None shows a date.

### AC9: Extreme dates match the header date's font size

1. Probe: Load a sensor history section at each target size in AC1. Compare the font size of all six extreme dates with the header date.
2. Expected result: Each extreme date and the date below `Latest available measurement` have a computed font size of 13px.
3. Example: At 390 × 844, Low shows `06 Oct · 08:15` and the header shows `06 Oct · 14:35:20`. Both dates have a computed font size of 13px.
