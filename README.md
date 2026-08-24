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

`DEVICES` is a JSON array of meter IDs and types. Multiple outdoor meters are read sequentially. `BLE_TIMEOUT_MS` is the timeout for each scan attempt and defaults to 15 seconds. `SCAN_RETRIES` is the maximum number of scan attempts and defaults to 8. The separate indoor meter script still uses its hardcoded ID.

The npm commands use Node.js native `.env` support. No environment package is required.

## Run

Read the outdoor meter through `src/crawler/index.ts`:

```sh
npm run read
```

Read the indoor meter:

```sh
npm run read:indoor
```

## Architecture

```text
index.ts
└── outdoorMeter.service.ts
    └── meter.repository.ts
```

The entrypoint calls services. Services contain the business flow and call repositories. Repositories interact directly with BLE.

## Output

The output is an array so that more devices can be added later:

```json
[
  {
    "deviceId": "ae67de586d5f7a96cce7f6179f1c740f",
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
