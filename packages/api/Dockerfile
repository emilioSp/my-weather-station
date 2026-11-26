FROM node:26-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/collector/package.json ./packages/collector/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
RUN npm ci --omit=dev --workspace @wx/api

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY packages/shared/package.json packages/shared/db.ts packages/shared/shared-environment.ts ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/api/src ./packages/api/src

USER node
EXPOSE 3000
CMD ["node", "packages/api/src/index.ts"]
