# Roadmap

This roadmap records owner-accepted outcomes and deferred ideas. Now and Next are intentionally empty. Later items have no promised order or delivery date.

Roadmap items are planning context, not permission to implement. The owner selects work and approves its requirements before implementation.

| ID   | Title                                                                                                 | Status    | Summary                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| R-01 | [Collect and store meter readings](#r-01-collect-and-store-meter-readings)                            | Completed | Collect readings from indoor and outdoor SwitchBot meters and store them in PostgreSQL.    |
| R-02 | [Display named meters and history](#r-02-display-named-meters-and-history)                            | Completed | Show current readings and history charts for configured, named meters.                     |
| R-03 | [Switch temperature units](#r-03-switch-temperature-units)                                            | Removed   | Temperature unit selection was removed; all displays use Celsius.                          |
| R-04 | [Date chart lows and highs](#r-04-date-chart-lows-and-highs)                                          | Completed | Show the measurement dates associated with chart lows and highs.                           |
| R-05 | [Monitor Raspberry Pi CPU temperature](#r-05-monitor-raspberry-pi-cpu-temperature)                    | Later     | Display and monitor the Raspberry Pi's CPU temperature in the application.                 |
| R-06 | [Show chart trends](#r-06-show-chart-trends)                                                          | Later     | Show tendencies on existing charts to make rising and falling measurements easier to spot. |
| R-07 | [Adapt the UI to the Raspberry Pi touchscreen](#r-07-adapt-the-ui-to-the-raspberry-pi-touchscreen)    | Completed | Adapt the dashboard to the owner's 7-inch 1024×714 IPS HDMI capacitive touchscreen.        |
| R-08 | [Add forecasts](#r-08-add-forecasts)                                                                  | Later     | Add forecasting capabilities with scope still to be defined.                               |
| R-09 | [Add alerts](#r-09-add-alerts)                                                                        | Later     | Notify the owner about conditions using rules and delivery methods still to be defined.    |
| R-10 | [Refresh the dashboard automatically](#r-10-refresh-the-dashboard-automatically)                      | Later     | Keep the page up to date without requiring a manual refresh.                               |
| R-11 | [Replace PostgREST with a small Node.js backend](#r-11-replace-postgrest-with-a-small-nodejs-backend) | Later     | Serve dashboard reads through Node.js and decide whether to use external hosting.          |

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
[specification](.specs/20261006-204022-show-measurement-dates-for-metric-lows-and-highs/spec.md), and [browser tests](packages/web/tests/ui/metric-extreme-dates.spec.ts).
The specification workflow still says `candidate-ready`; acceptance here comes from the owner's explicit confirmation, not that workflow status.

### R-07: Adapt the UI to the Raspberry Pi touchscreen

The dashboard displays three meter cards in one row at 1024×714, with always-visible history charts, card navigation to each meter's history, and scroll-to-top buttons.
The default history range is three days. Documentation and visual snapshots use the touchscreen's target resolution.

#### Evidence

The owner confirmed completion. See the [responsive styles](packages/web/styles.css), [history charts](packages/web/components/weather-station/HistoryChart.tsx),
[reading cards](packages/web/components/weather-station/WeatherCard.tsx), and [visual tests](packages/web/tests/visual/dashboard.visual.spec.ts).

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

### R-10: Refresh the dashboard automatically

#### Objective

Automatically refresh the dashboard so the page stays up to date without a manual refresh. Refresh timing and behavior remain open.

#### Completed when

The page updates automatically without user action. Refresh timing and which displayed data should update must be defined before implementation.

### R-11: Replace PostgREST with a small Node.js backend

#### Objective

Remove PostgREST from the dashboard's data path. Add a small Node.js service that uses Knex to read current measurements and chart history from the existing Supabase
PostgreSQL database. Decide whether to use an external hosting provider or run the service on existing infrastructure.

#### Why replace PostgREST?

On November 25, 2026, the Supabase Data API returned `HTTP 504 / PGRST003` for all three sensors' latest-reading requests. PostgREST timed out waiting for a connection
from its internal PostgreSQL pool, before the queries could run. The dashboard could not load the readings and never reached the chart history request. The collector kept
writing through Knex, which connects to PostgreSQL without going through PostgREST.

A database snapshot during the incident showed eight client connections. The only visible PostgREST `authenticator` session was idle on `LISTEN "pgrst"`, with no open
transaction or blocking PID, and the role had no connection limit. The cause of the pool timeout remains unknown. The evidence does not establish a bug in `supabase-js`
or PostgreSQL 18, or show that earlier incidents had the same cause. The proposed service would bypass the layer that timed out without replacing the database.

#### Hosting options

Starting prices are planning estimates. Confirm pricing, runtime limits, and PostgreSQL connectivity before choosing a provider.

| Provider                                                                       |               Starting price | What to expect                                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------: | ---------------------------------------------------------------------------------------------------------- |
| [DigitalOcean App Platform](https://www.digitalocean.com/pricing/app-platform) |                     $5/month | Always-on managed Node.js service                                                                          |
| [Koyeb](https://www.koyeb.com/pricing)                                         |                    Free tier | Managed Node.js hosting with idle suspension on the free tier                                              |
| [Fly.io](https://fly.io/pricing/)                                              |            About $2.19/month | Small VM with configurable auto-stop. Pricing varies by region                                             |
| [Scalingo](https://scalingo.com/pricing)                                       |                  €7.20/month | Always-on managed container                                                                                |
| [Clever Cloud](https://www.clever.cloud/pricing/)                              |                  Usage-based | Managed Node.js hosting with trial credits                                                                 |
| [Google Cloud Run](https://cloud.google.com/run/pricing)                       | Usage-based with a free tier | Managed container that can scale to zero                                                                   |
| [Vercel Hobby](https://vercel.com/docs/plans/hobby)                            |        Free for personal use | Node.js functions with database pooling to manage                                                          |
| [Render](https://render.com/pricing)                                           |                    Free tier | Managed Node.js service; free instances spin down after 15 minutes idle. Always-on Starter costs $7/month. |
| [Heroku Basic](https://www.heroku.com/pricing/)                                |                     $7/month | Always-on managed Node.js service                                                                          |
| [Hetzner Cloud](https://www.hetzner.com/cloud/)                                | About €5.49/month before VAT | Self-managed European VPS                                                                                  |
| [AWS Lightsail](https://aws.amazon.com/lightsail/pricing/)                     |                     $5/month | Self-managed VPS with predictable pricing                                                                  |

#### Completed when

The dashboard loads current readings and chart history through the Node.js service without using PostgREST, and the hosting decision is recorded. This would supersede
[ADR-002](ADR.md#adr-002-postgresql-storage-with-separate-write-and-read-clients) for dashboard reads.
