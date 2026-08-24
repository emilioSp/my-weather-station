# My Weather Station

Reads BLE advertisements from SwitchBot indoor and outdoor meters using [`@stoprocent/noble`](https://www.npmjs.com/package/@stoprocent/noble).

The script reads:

* Temperature in °C
* Humidity in percent
* Battery level in percent
* BLE signal power in dBm

## Requirements

* Node.js 26 or newer for native TypeScript support
* A Bluetooth adapter
* Bluetooth permission for the terminal or Node.js

## Configuration

Create a `.env` file:

```dotenv
DEVICE_ID=ae67de586d5f7a96cce7f6179f1c740f
BLE_TIMEOUT_MS=120000
```

`DEVICE_ID` is required by the outdoor meter script. The indoor meter ID is currently hardcoded in `indoor-meter.ts`. `BLE_TIMEOUT_MS` is optional and defaults to 120 seconds.

## Run

Install the dependencies:

```sh
npm install
```

Read the outdoor meter:

```sh
npm run read
```

Read the indoor meter:

```sh
npm run read:indoor
```

The npm commands use Node.js native `.env` file support. No environment package is required.

## Output

The output is an array so that more devices can be added later:

```json
[
  {
    "deviceId": "ae67de586d5f7a96cce7f6179f1c740f",
    "signalPowerDBM": -89,
    "temperature": 32.2,
    "humidity": 39,
    "battery": 96
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
