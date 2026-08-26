# My Weather Station

Reads BLE advertisements from SwitchBot indoor and outdoor meters using [`@stoprocent/noble`](https://www.npmjs.com/package/@stoprocent/noble) and stores the measurements in PostgreSQL.

The application reads and calculates:

* Temperature in °C
* Dew point in °C
* Heat index in °C
* Humidity in percent
* Battery level in percent
* BLE signal power in dBm

## Prerequisites

* Node.js 26 or newer for native TypeScript support
* A Bluetooth adapter
* Bluetooth permission for the terminal or Node.js
* PostgreSQL 17 or Docker

## Local development setup

Install the dependencies:

```sh
npm install
```

Create a `.env.local` file:

```dotenv
DEVICES='[{"deviceId":"ae67de586d5f7a96cce7f6179f1c740f","type":"outdoor"},{"deviceId":"f2c1f72ae2258e5affbe6f8e7bc147b3","type":"indoor"}]'
BLE_TIMEOUT_MS=15000
SCAN_RETRIES=8
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=my-weather-station
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

`DEVICES` is a JSON array of meter IDs and strategy types. Configured meters are read sequentially. `BLE_TIMEOUT_MS` is the timeout for each scan attempt and defaults to 15 seconds. `SCAN_RETRIES` is the maximum number of scan attempts and defaults to 8.

The collector implements both `outdoor` and `indoor` SwitchBot meter strategies.

The npm commands use Node.js native `.env.local` support. No environment package is required.

Start PostgreSQL and run the migration:

```sh
docker compose up -d
npm run migrate
```

## Run

Read and store the configured meters through `src/collector/index.ts`:

```sh
npm run store-measure
```

## Architecture

The collector uses the Strategy pattern:

```text
index.ts
  └── meters/meter.factory.ts
      └── meters/Meter strategy
          ├── api/sensor.api.ts
          │   └── @stoprocent/noble
          ├── db/measure.repository.ts
          │   └── db/db.ts
          │       └── PostgreSQL
          └── errors/NoCompleteReadingError.ts
```

`index.ts` is the startup and presentation layer. For each configured device, it asks `createMeter()` for the correct strategy, calls `read()`, and prints the stored measure returned by the strategy.

The folders have clear responsibilities:

* `api/` handles external resources, including BLE advertisements.
* `db/` manages the PostgreSQL connection and stores measures.
* `errors/` contains domain errors.
* `meters/` contains business logic that converts advertisements into measures.

`OutdoorMeter` and `IndoorMeter` extend the abstract `Meter` class and implement `MeterInterface`, which exposes:

* `getMeter()` for the device ID and type
* `read()` for the stored measure

Each strategy owns its meter-specific decoding. The shared `Meter` class reads advertisements through `api/sensor.api.ts`, calculates dew point and heat index with `meters/utils/`, stores the complete reading through `db/measure.repository.ts`, and returns the inserted database row.

## Output

The output is an array so that more devices can be added later:

```json
[
  {
    "id": "4f7edb49-14fa-426f-bd3a-bfcf5872ce65",
    "deviceId": "ae67de586d5f7a96cce7f6179f1c740f",
    "deviceType": "outdoor",
    "temperature": 32.2,
    "dewPoint": 16.5,
    "heatIndex": 32.4,
    "humidity": 39,
    "battery": 96,
    "signalPowerDBM": -89,
    "measuredAt": "2026-08-25T16:12:03+00:00[UTC]"
  },
  {
    "id": "c7ed878a-b9c8-4e7a-aafd-ade9f57ebd38",
    "deviceId": "f2c1f72ae2258e5affbe6f8e7bc147b3",
    "deviceType": "indoor",
    "temperature": 28,
    "dewPoint": 22.2,
    "heatIndex": 30.8,
    "humidity": 71,
    "battery": 100,
    "signalPowerDBM": -67,
    "measuredAt": "2026-08-25T16:12:24+00:00[UTC]"
  }
]
```

## BLE signal power

`signalPowerDBM` is the Bluetooth signal strength received by the computer. It is also called RSSI and is measured in dBm.

A value closer to `0` means a stronger signal.

| Value | Quality |
|---:|---|
| `-30 dBm` | Excellent |
| `-50 dBm` | Strong |
| `-70 dBm` | Acceptable |
| `-80 dBm` | Weak |
| `-90 dBm` | Very weak |
| `-100 dBm` | Almost unusable |

For example, `-89 dBm` is a very weak signal. BLE packets can be missed, so reading the thermometer can take longer or time out.

Distance, walls, metal objects, battery condition, and radio interference can change the value. Move the computer or Bluetooth adapter closer to improve reception.

The value shows the signal strength when the packet is received. It can change between readings.
