# My Weather Station

Reads BLE advertisements from SwitchBot indoor and outdoor meters using [`@stoprocent/noble`](https://www.npmjs.com/package/@stoprocent/noble).

The application reads:

* Temperature in °C
* Humidity in percent
* Battery level in percent
* BLE signal power in dBm

## Prerequisites

* Node.js 26 or newer for native TypeScript support
* A Bluetooth adapter
* Bluetooth permission for the terminal or Node.js

## Local development setup

Install the dependencies:

```sh
npm install
```

Create a `.env` file:

```dotenv
DEVICES='[{"deviceId":"ae67de586d5f7a96cce7f6179f1c740f","type":"outdoor"}]'
BLE_TIMEOUT_MS=15000
SCAN_RETRIES=8
```

`DEVICES` is a JSON array of meter IDs and strategy types. Configured meters are read sequentially. `BLE_TIMEOUT_MS` is the timeout for each scan attempt and defaults to 15 seconds. `SCAN_RETRIES` is the maximum number of scan attempts and defaults to 8.

The crawler currently implements the `outdoor` strategy. The `indoor` strategy exists but throws `Not yet implemented`.

The npm commands use Node.js native `.env` support. No environment package is required.

## Run

Read the configured meters through `src/crawler/index.ts`:

```sh
npm run read
```

Read the indoor meter:

```sh
npm run read:indoor
```

## Architecture

The crawler uses the Strategy pattern:

```text
index.ts
  ├── environment.ts
  └── meter.factory.ts
      └── MeterInterface strategy
          ├── OutdoorMeter.ts
          │   └── meter.repository.ts
          │       └── @stoprocent/noble
          └── IndoorMeter.ts (not yet implemented)
```

`index.ts` is the startup and presentation layer. For each configured device, it asks `createMeter()` for the correct strategy, calls `read()`, and prints the resulting JSON array.

`OutdoorMeter` and `IndoorMeter` implement `MeterInterface`, which exposes:

* `getMeter()` for the device ID and type
* `read()` for the weather reading

Each strategy owns its meter-specific behavior. Decoding and reading state remain in private class methods. `meter.repository.ts` is generic and only manages BLE discovery and advertisements.

## Output

The output is an array so that more devices can be added later:

```json
[
  {
    "deviceId": "ae67de586d5f7a96cce7f6179f1c740f",
    "type": "outdoor",
    "temperature": 32.2,
    "humidity": 39,
    "battery": 96,
    "signalPowerDBM": -89
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
