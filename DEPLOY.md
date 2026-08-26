# Deployment

This guide deploys the collector to a Raspberry Pi 3 with 64-bit Raspberry Pi OS.

## Requirements

- A Mac with Docker Desktop and Docker Buildx.
- A private Docker Hub repository named `espatola/my-weather-station`.
- A Raspberry Pi 3 with a powered-on Bluetooth adapter.

## Create the Docker Hub repository

1. Sign in to Docker Hub.
2. Create the `my-weather-station` repository.
3. Set repository visibility to **Private**.

## MAC

### Build and push the image

Sign in to Docker Hub:

```sh
docker login
```

Build the ARM64 image and push it:

```sh
docker buildx build \
  --platform linux/arm64 \
  --tag espatola/my-weather-station:latest \
  --push \
  .
```

Check the published image:

```sh
docker buildx imagetools inspect espatola/my-weather-station:latest
```

The output must include `linux/arm64`.

## Raspberry Pi

### Start the Raspberry Pi

1. Insert the SD card into the Raspberry Pi.
2. Connect the power supply.
3. Wait for the Raspberry Pi to start.
4. From the Mac, connect with SSH:

```sh
ssh <pi-user>@<pi-hostname>.local
```

Use the user name and host name configured in Raspberry Pi Imager.

### Install Docker and BlueZ

Run these commands on the Raspberry Pi:

```sh
sudo apt-get update
sudo apt-get install --yes ca-certificates curl bluez vim
sudo install --mode 0755 --directory /etc/apt/keyrings
sudo curl --fail --silent --show-error --location \
  https://download.docker.com/linux/debian/gpg \
  --output /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Add the Docker package source:

```sh
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Install Docker:

```sh
sudo apt-get update
sudo apt-get install --yes \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
sudo usermod --append --groups docker "$USER"
```

Log out and connect with SSH again. Then check Docker:

```sh
docker run --rm hello-world
```

Start BlueZ, unblock Bluetooth, and power on the adapter:

```sh
sudo systemctl enable --now bluetooth
sudo rfkill unblock bluetooth
sudo systemctl restart bluetooth
sudo bluetoothctl power on
bluetoothctl show
```

The output must show a controller with these values:

```text
Powered: yes
PowerState: on
```

### Create the deployment directory

Run these commands on the Raspberry Pi:

```sh
cd ~/Desktop
mkdir my-weather-station
cd my-weather-station
```

Create `.env` in this directory:

```dotenv
DEVICES=[{"address":"AA:BB:CC:DD:EE:FF","type":"outdoor"},{"address":"11:22:33:44:55:66","type":"indoor"}]
BLE_TIMEOUT_MS=15000
SCAN_RETRIES=8
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=my-weather-station
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace-this-password
```

Replace the Bluetooth addresses and database password. Use the `address` value from `ble-raw.ts`. Keep the colons in each address. On macOS, use `deviceId` instead of `address`. Protect the file:

```sh
chmod 600 .env
```

## Pull the collector image

Sign in and pull the private image:

```sh
docker login
docker pull espatola/my-weather-station:latest
docker logout
```

Use a Docker Hub access token when Docker asks for a password. `docker logout` removes the Docker Hub credential from the Raspberry Pi. The downloaded image stays available for container starts and restarts.

## Run the collector

Start the collector:

```sh
docker run --detach \
  --name my-weather-station \
  --restart unless-stopped \
  --network host \
  --cap-add NET_RAW \
  --env-file .env \
  espatola/my-weather-station:latest
```

`--network host` and `NET_RAW` give Noble access to the Raspberry Pi Bluetooth adapter.

Check collector output:

```sh
docker logs --follow my-weather-station
```

## Troubleshooting

Check BLE advertisements:

```sh
docker run --rm \
  --network host \
  --cap-add NET_RAW \
  --name ble \
  espatola/my-weather-station:latest \
  node ble-raw.ts

Check the CPU temperature:

```sh
vcgencmd measure_temp
```

A temperature below `80°C` is safe.
```

