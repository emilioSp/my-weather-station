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
COPY apps/collector/package.json ./apps/collector/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --omit=dev --workspace @wx/collector

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
COPY packages/shared ./packages/shared
COPY apps/collector ./apps/collector

CMD ["node", "apps/collector/index.ts"]
