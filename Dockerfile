FROM node:26-bookworm-slim AS dependencies

WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends \
    g++ \
    libbluetooth-dev \
    libudev-dev \
    make \
    pkg-config \
    python3 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:26-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends \
    bluetooth \
    bluez \
    libbluetooth3 \
    libudev1 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY knexfile.js ./
COPY migrations ./migrations
COPY src ./src
COPY ble-raw.ts ./ble-raw.ts

CMD ["node", "src/collector/index.ts"]
