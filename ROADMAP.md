# Roadmap

This roadmap records owner-accepted outcomes and deferred ideas. Now and Next are intentionally empty. Later items have no promised order or delivery date.

Roadmap items are planning context, not permission to implement. The owner selects work and approves its requirements before implementation.

| ID   | Title                                                                                              | Status    | Summary                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| R-01 | [Collect and store meter readings](#r-01-collect-and-store-meter-readings)                         | Completed | Collect readings from indoor and outdoor SwitchBot meters and store them in PostgreSQL.    |
| R-02 | [Display named meters and history](#r-02-display-named-meters-and-history)                         | Completed | Show current readings and history charts for configured, named meters.                     |
| R-03 | [Switch temperature units](#r-03-switch-temperature-units)                                         | Removed   | Temperature unit selection was removed; all displays use Celsius.                          |
| R-04 | [Date chart lows and highs](#r-04-date-chart-lows-and-highs)                                       | Completed | Show the measurement dates associated with chart lows and highs.                           |
| R-05 | [Monitor Raspberry Pi CPU temperature](#r-05-monitor-raspberry-pi-cpu-temperature)                 | Later     | Display and monitor the Raspberry Pi's CPU temperature in the application.                 |
| R-06 | [Show chart trends](#r-06-show-chart-trends)                                                       | Later     | Show tendencies on existing charts to make rising and falling measurements easier to spot. |
| R-07 | [Adapt the UI to the Raspberry Pi touchscreen](#r-07-adapt-the-ui-to-the-raspberry-pi-touchscreen) | Later     | Redesign the interface for the owner's 7-inch 1024×600 IPS HDMI capacitive touchscreen.    |
| R-08 | [Add forecasts](#r-08-add-forecasts)                                                               | Later     | Add forecasting capabilities with scope still to be defined.                               |
| R-09 | [Add alerts](#r-09-add-alerts)                                                                     | Later     | Notify the owner about conditions using rules and delivery methods still to be defined.    |

## Completed

### R-01: Collect and store meter readings

The collector reads indoor and outdoor SwitchBot meters, calculates derived weather values, and stores complete measurements in PostgreSQL.

#### Evidence

The owner confirmed acceptance during the constitution initialization interview. See the [collector entrypoint](packages/collector/index.ts),
[meter workflow](packages/collector/meters/Meter.ts), and [measurement repository](packages/collector/db/measure.repository.ts).

### R-02: Display named meters and history

The web app displays current readings and history charts using configured device names.

#### Evidence

The owner confirmed acceptance during the constitution initialization interview. See the [dashboard](packages/web/views/WeatherStation.tsx) and the commits for
[stored device names](https://github.com/emilioSp/my-weather-station/commit/d3dd9db),
[name-based dashboard queries](https://github.com/emilioSp/my-weather-station/commit/8e6044b), and
[multiple-meter display](https://github.com/emilioSp/my-weather-station/commit/26d999d).

### R-03: Switch temperature units

Originally completed with Celsius and Fahrenheit selection and browser preference storage. The switch has since been removed at the owner's request; the dashboard now
always displays Celsius.

#### Evidence

The owner confirmed acceptance during the constitution initialization interview. See the
[original implementation commit](https://github.com/emilioSp/my-weather-station/commit/c41a6f4). The [current dashboard](packages/web/views/WeatherStation.tsx) uses
Celsius only, without unit selection or conversion.

### R-04: Date chart lows and highs

Temperature, humidity, and dew point charts show the measurement dates for their lows and highs.

#### Evidence

The owner confirmed acceptance during the constitution initialization interview. See the
[implementation commit](https://github.com/emilioSp/my-weather-station/commit/52b4944),
[specification](.specs/20261006-204022-show-measurement-dates-for-metric-lows-and-highs/spec.md), and [browser tests](packages/web/e2e/metric-extreme-dates.spec.ts). The
specification workflow still says `candidate-ready`; acceptance here comes from the owner's explicit confirmation, not that workflow status.

## Now

No current priority selected.

## Next

No following priority selected.

## Later

### R-05: Monitor Raspberry Pi CPU temperature

#### Objective

Display and monitor the Raspberry Pi's CPU temperature in the application. [DEPLOY.md](DEPLOY.md) already documents a manual temperature check, but that is not an
application monitoring feature. Collection, history, and presentation details remain open.

#### Completed when

Not yet defined. The owner must decide which CPU temperature data to collect and how it should appear.

### R-06: Show chart trends

#### Objective

Add tendency indicators to the existing UI charts so the owner can spot increases and drops, such as rising or falling temperature. Metrics, comparison windows, and trend
calculation remain open.

#### Completed when

Not yet defined. The owner must choose the trend meaning, calculation window, and visual presentation.

### R-07: Adapt the UI to the Raspberry Pi touchscreen

#### Objective

Redesign the UI to be pixel perfect on the owner's 7-inch 1024×600 IPS LCD HDMI capacitive touchscreen for Raspberry Pi. The target display is selected; the detailed
layout and touch interactions are not yet specified. This is additional work beyond the current responsive layouts.

#### Completed when

Not yet defined. The owner must approve the target design and its layout and touch interaction requirements.

### R-08: Add forecasts

#### Objective

Explore forecasts for the owner's weather station. Data sources, forecasted conditions, time horizon, and UI scope remain open. Forecasts are not part of the current
application's responsibility.

#### Completed when

Not yet defined. The owner must decide what should be forecast, from which data, and how forecast results should be evaluated and displayed.

### R-09: Add alerts

#### Objective

Add alerts for the owner. Trigger conditions, delivery methods, and operating requirements remain open. Alerts are not part of the current application's responsibility.

#### Completed when

Not yet defined. The owner must choose alert conditions, delivery methods, and the expected notification behavior.
